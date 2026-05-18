import './globals.css';
import '@copilotkit/react-ui/v2/styles.css';
import { CopilotKit } from '@copilotkit/react-core';

export const metadata = {
  title: 'Agora Agents UI',
  description: 'CopilotKit interface for Arc Testnet agent workflows',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit>
      </body>
    </html>
  );
}
