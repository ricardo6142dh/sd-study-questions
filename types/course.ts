export type CourseTopic = {
  slug: string;
  title: string;
};

export type CourseModule = {
  slug: string;
  title: string;
  order: number;
  key: string;
  topics: CourseTopic[];
};

export type CourseCatalogMetadata = {
  slug: string;
  title: string;
  language: string;
  provider: string;
  instructor: string;
  landingPage: string;
  referenceRepo?: string;
  modules: CourseModule[];
};

export type CourseCatalogEntry = CourseCatalogMetadata & {
  yearLabel: string;
  questionCount: number;
  moduleCount: number;
  topicCount: number;
};
