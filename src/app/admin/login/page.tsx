import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Admin sign in — Cricket Fiesta '26" };

export default function AdminLoginPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--hero-grad)",
        padding: 20,
      }}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
