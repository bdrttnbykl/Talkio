type AvatarProps = {
  name: string;
  src?: string | null;
};

export default function Avatar({ name, src }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    return <img className="avatar" src={getAvatarUrl(src)} alt={name} />;
  }

  return <span className="avatar avatar-fallback">{initials}</span>;
}

function getAvatarUrl(src: string) {
  if (src.startsWith("http") || src.startsWith("data:")) return src;

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
  const assetBaseUrl = apiUrl.replace(/\/api\/?$/, "");
  return `${assetBaseUrl}${src}`;
}
