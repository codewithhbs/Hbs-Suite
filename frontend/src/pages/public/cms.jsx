import { useParams } from "react-router-dom";
import { CmsPage } from "@/components/cms-page";

/** /terms, /privacy, /disclaimer (fixed slug) and /p/:slug */
export default function CmsRoute({ slug: fixed }) {
  const { slug } = useParams();
  return <CmsPage key={fixed || slug} slug={fixed || slug} />;
}
