import type { Metadata } from "next";

export const getMetadata = ({
  title,
  description,
  imageRelativePath = "/thumbnail.png",
}: {
  title: string;
  description: string;
  imageRelativePath?: string;
}): Metadata => {
  return {
    title,
    description,
    openGraph: {
      images: [imageRelativePath],
    },
    twitter: {
      images: [imageRelativePath],
      description,
    },
  };
};
