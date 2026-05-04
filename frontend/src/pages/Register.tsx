import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Register() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await signUp({ name, email, password });
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Create account</h1>
        <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit">Register</Button>
        <Link to="/login">Already have an account?</Link>
      </form>
    </main>
  );
}
