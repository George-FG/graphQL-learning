import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import path from "path";
import { prisma } from "../src/lib/prisma";

type StopRow = {
  stop_id: string;
  stop_name: string;
  stop_lat?: string;
  stop_lon?: string;
  location_type?: string;
};

type RouteRow = {
  route_id: string;
  route_short_name?: string;
  route_long_name?: string;
  route_type?: string;
};

type TripRow = {
  trip_id: string;
  route_id: string;
};

type StopTimeRow = {
  trip_id: string;
  stop_id: string;
  stop_sequence: string;
  arrival_time?: string;
  departure_time?: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "gtfs", "extracted");

function parseCsv<T>(content: string): T[] {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
}

function parseOptionalFloat(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDurationMinutes(
  departureTime?: string,
  arrivalTime?: string
): number | null {
  if (!departureTime || !arrivalTime) return null;

  const toSeconds = (time: string) => {
    const [h, m, s] = time.split(":").map(Number);
    if ([h, m, s].some((n) => Number.isNaN(n))) return null;
    return h * 3600 + m * 60 + s;
  };

  const dep = toSeconds(departureTime);
  const arr = toSeconds(arrivalTime);

  if (dep === null || arr === null) return null;

  const diff = arr - dep;
  if (diff < 0) return null;

  return Math.round(diff / 60);
}

async function main() {
  const stopsContent = await readFile(path.join(DATA_DIR, "stops.txt"), "utf8");
  const routesContent = await readFile(path.join(DATA_DIR, "routes.txt"), "utf8");
  const tripsContent = await readFile(path.join(DATA_DIR, "trips.txt"), "utf8");
  const stopTimesContent = await readFile(
    path.join(DATA_DIR, "stop_times.txt"),
    "utf8"
  );

  const stops = parseCsv<StopRow>(stopsContent);
  const routes = parseCsv<RouteRow>(routesContent);
  const trips = parseCsv<TripRow>(tripsContent);
  const stopTimes = parseCsv<StopTimeRow>(stopTimesContent);

  const routeMap = new Map(
    routes.map((route) => [
      route.route_id,
      {
        routeName: route.route_long_name || route.route_short_name || route.route_id,
        transportType: route.route_type || null,
      },
    ])
  );

  const tripMap = new Map(
    trips.map((trip) => [
      trip.trip_id,
      {
        routeId: trip.route_id,
      },
    ])
  );

  const stopTimesByTrip = new Map<string, StopTimeRow[]>();

  for (const stopTime of stopTimes) {
    const existing = stopTimesByTrip.get(stopTime.trip_id) ?? [];
    existing.push(stopTime);
    stopTimesByTrip.set(stopTime.trip_id, existing);
  }

  console.log(`Importing ${stops.length} stops...`);

  for (const stop of stops) {
    await prisma.location.upsert({
      where: { id: stop.stop_id },
      update: {
        name: stop.stop_name,
        lat: parseOptionalFloat(stop.stop_lat),
        lng: parseOptionalFloat(stop.stop_lon),
        type: stop.location_type || null,
      },
      create: {
        id: stop.stop_id,
        name: stop.stop_name,
        lat: parseOptionalFloat(stop.stop_lat),
        lng: parseOptionalFloat(stop.stop_lon),
        type: stop.location_type || null,
      },
    });
  }

  console.log(`Building connections...`);

  const dedupedConnections = new Map<
    string,
    {
      id: string;
      fromId: string;
      toId: string;
      transportType: string | null;
      routeId: string | null;
      routeName: string | null;
      duration: number | null;
    }
  >();

  for (const [tripId, tripStopTimes] of stopTimesByTrip.entries()) {
    const trip = tripMap.get(tripId);
    if (!trip) continue;

    const route = routeMap.get(trip.routeId);

    tripStopTimes.sort(
      (a, b) => Number(a.stop_sequence) - Number(b.stop_sequence)
    );

    for (let i = 0; i < tripStopTimes.length - 1; i++) {
      const from = tripStopTimes[i];
      const to = tripStopTimes[i + 1];

      const key = `${from.stop_id}__${to.stop_id}__${trip.routeId}`;

      if (!dedupedConnections.has(key)) {
        dedupedConnections.set(key, {
          id: key,
          fromId: from.stop_id,
          toId: to.stop_id,
          transportType: route?.transportType ?? null,
          routeId: trip.routeId,
          routeName: route?.routeName ?? null,
          duration: parseDurationMinutes(from.departure_time, to.arrival_time),
        });
      }
    }
  }

  console.log(`Importing ${dedupedConnections.size} connections...`);

  for (const connection of dedupedConnections.values()) {
    await prisma.connection.upsert({
      where: { id: connection.id },
      update: {
        fromId: connection.fromId,
        toId: connection.toId,
        transportType: connection.transportType,
        routeId: connection.routeId,
        routeName: connection.routeName,
        duration: connection.duration,
      },
      create: connection,
    });
  }

  console.log("GTFS import complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });