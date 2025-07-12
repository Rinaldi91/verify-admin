export default function Footer() {
  return (
    <footer className="w-full border-t bg-gray-900 py-4 text-sm text-gray-700">
      <div className="container mx-auto flex justify-between items-center px-4 text-white">
        <span>Powered by PT. Anugerah Rezeki Bersama Indonesia.</span>
        <span>
          © {new Date().getFullYear()} Smart Connection.
        </span>
      </div>
    </footer>
  );
}
