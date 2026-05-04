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
    return <img className="avatar" src={src} alt={name} />;
  }

  return <span className="avatar avatar-fallback">{initials}</span>;
}
