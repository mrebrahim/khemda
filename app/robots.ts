import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // لوحة الأبطال مفتوحة بلينك، بس مش عايزينها في نتائج البحث — فيها أسامي أطفال
      disallow: "/",
    },
  };
}
