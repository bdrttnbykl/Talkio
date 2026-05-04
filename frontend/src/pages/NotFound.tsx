import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="auth-form">
        <h1>Page not found</h1>
        <Link to="/">Back to chat</Link>
      </div>
    </main>
  );
}
