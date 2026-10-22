/**
 * The few pieces of artwork outside the main content: the witch on her broom and a bat
 * crossing the screen now and then, and (on the phone pages) a ghost and a bat in the
 * corners. Public-domain artwork from public/art. No hooks, so the phone download page
 * renders the same markup on the server (scripts/gen-scenery.tsx).
 */
export type CollageVariant = "home" | "page" | "phone";

export default function Collage({ variant = "page" }: { variant?: CollageVariant }) {
  if (variant === "home") return null;
  return (
    <div className={`collage ${variant}`} aria-hidden="true">
      {variant === "phone" && (
        <>
          <img className="art phone-ghost" src="/art/ghost.webp" alt="" />
          <img className="art phone-bat" src="/art/bat.webp" alt="" />
        </>
      )}
      <div className="fly witch">
        <img src="/art/witch-broom.webp" alt="" />
      </div>
      {variant === "page" && (
        <div className="fly bat">
          <img src="/art/bat.webp" alt="" />
        </div>
      )}
    </div>
  );
}
