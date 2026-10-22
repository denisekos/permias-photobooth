/**
 * Still artwork for the phone download pages: a ghost, a bat and the witch on her broom in
 * the corners. Public-domain artwork from public/art. No hooks, because
 * scripts/gen-scenery.tsx renders it to static markup for the phone route handlers.
 */
export default function Collage() {
  return (
    <div className="collage" aria-hidden="true">
      <img className="art phone-ghost" src="/art/ghost.webp" alt="" />
      <img className="art phone-bat" src="/art/bat.webp" alt="" />
      <img className="art phone-witch" src="/art/witch-broom.webp" alt="" />
    </div>
  );
}
