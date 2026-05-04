import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Şifremi unuttum</h1>
        <p className="auth-help">
          Hesabına bağlı e-posta adresini gir. Şifre sıfırlama altyapısı eklendiğinde bağlantı bu adrese gönderilecek.
        </p>
        <Input type="email" placeholder="E-posta" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Button type="submit">Devam et</Button>
        {submitted ? <p className="auth-success">E-posta adresi alındı.</p> : null}
        <Link to="/login">Girişe dön</Link>
      </form>
    </main>
  );
}
