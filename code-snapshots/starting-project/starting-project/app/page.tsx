export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">Hello World</h1>
      <section className="max-w-xl">
        <h2 className="mb-4 text-2xl font-medium tracking-tight">
          Advantages of Claude Code
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Works right in your terminal, so there is no new IDE to learn.</li>
          <li>Understands your whole codebase without manual context selection.</li>
          <li>Edits files, runs commands, and executes tests on your behalf.</li>
          <li>Handles Git workflows like commits, branches, and pull requests.</li>
          <li>Extensible through skills, hooks, subagents, and MCP servers.</li>
          <li>Asks for permission before making changes you have not approved.</li>
        </ul>
      </section>
    </main>
  );
}
