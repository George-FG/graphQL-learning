import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkTo: string;
};

export default function AuthFormLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}: Props) {
  return (
    <div className="page-shell">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {children}

        <p className="auth-footer">
          {footerText} <Link to={footerLinkTo}>{footerLinkText}</Link>
        </p>
      </div>
    </div>
  );
}