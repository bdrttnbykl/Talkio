import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await signIn({ email, password });
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Sign in</h1>
        <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Link className="auth-link" to="/forgot-password">
          Şifremi unuttum
        </Link>
        <Button type="submit">Log in</Button>
        <Link to="/register">Create account</Link>
      </form>
    </main>
  );
}
