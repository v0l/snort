import { Link } from "react-router-dom";

export default function RelaySoftware({ software }: { software: string }) {
  if (software.includes("git")) {
    const u = new URL(software);
    return <Link to={software}>{u.pathname.split("/").at(-1)?.replace(".git", "")}</Link>;
  }
  return software;
}
