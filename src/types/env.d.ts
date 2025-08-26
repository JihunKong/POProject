declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    UPSTAGE_API_KEY: string;
    ALLOWED_EMAIL_DOMAIN: string;
    GOOGLE_SERVICE_ACCOUNT?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}