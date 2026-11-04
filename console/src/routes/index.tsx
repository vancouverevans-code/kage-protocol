import { createFileRoute } from "@tanstack/react-router";
import { KageApp } from "@/components/kage/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <KageApp />;
}
