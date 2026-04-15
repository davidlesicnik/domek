import Link from "next/link";

const links = [
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of use", href: "/terms" },
  { label: "Cookie policy", href: "/cookies" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#dfddd6] bg-[#fdfcf8] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#9ea49f]">
          Domek — a household planner for the people who live there.
        </p>
        <nav aria-label="Legal">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {links.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-xs text-[#9ea49f] underline-offset-2 transition hover:text-[#686e6a] hover:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
