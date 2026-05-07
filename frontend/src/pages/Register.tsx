import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Register() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await signUp({ name, email, password });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Registration failed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Create account</h1>
        <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Register"}
        </Button>
        <Link to="/login">Already have an account?</Link>
      </form>
    </main>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    return message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}
