import './globals.css';
import '@copilotkit/react-ui/v2/styles.css';
import { CopilotKit } from '@copilotkit/react-core';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Agora Agents UI',
  description: 'CopilotKit interface for Arc Testnet agent workflows',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit>
      </body>
    </html>
  );
}
