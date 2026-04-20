const USERNAME_KEY = "app_username";

export function saveUsername(username: string) {
  localStorage.setItem(USERNAME_KEY, username);
}

export function getUsername() {
  return localStorage.getItem(USERNAME_KEY);
}

export function clearUsername() {
  localStorage.removeItem(USERNAME_KEY);
}