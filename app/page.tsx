import RichTextEditor from './components/RichTextEditor';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Rich Text Editor</h1>
      <RichTextEditor />
    </main>
  );
}
