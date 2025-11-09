import svgLogo from '@assets/images/svg/logo.svg';

export default function Header() {
  return (
    <header>
      <div className="flex items-center gap-2">
      <span className="w-10 h-10">
        <img src={svgLogo.src} alt="Logo" className="w-full h-full block" />
      </span>
      <h1>Something</h1>
      </div>
    </header>
  );
}