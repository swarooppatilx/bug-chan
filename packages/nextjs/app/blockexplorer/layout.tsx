import type { Metadata } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata: Metadata = {
  ...getMetadata({
    title: "Block Explorer",
    description: "Local-only block explorer utilities",
  }),
  robots: { index: false, follow: false },
};

const BlockExplorerLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default BlockExplorerLayout;
