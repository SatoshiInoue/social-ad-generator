#!/usr/bin/env ts-node
/**
 * Environment Variables Verification Script
 * Run: npx ts-node scripts/verify-env.ts
 */

import { config } from 'dotenv';
config();

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, condition: boolean, passMsg: string, failMsg: string) {
  results.push({
    name,
    status: condition ? 'pass' : 'fail',
    message: condition ? passMsg : failMsg,
  });
}

function warn(name: string, message: string) {
  results.push({
    name,
    status: 'warn',
    message,
  });
}

console.log('🔍 Verifying environment variables...\n');

// Database
check(
  'DATABASE_URL',
  !!process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://'),
  '✅ PostgreSQL connection string found',
  '❌ DATABASE_URL missing or invalid (must start with postgresql://)'
);

// NextAuth
check(
  'NEXTAUTH_URL',
  !!process.env.NEXTAUTH_URL,
  `✅ NextAuth URL: ${process.env.NEXTAUTH_URL}`,
  '❌ NEXTAUTH_URL missing'
);

check(
  'NEXTAUTH_SECRET',
  !!process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32,
  `✅ NextAuth secret set (${process.env.NEXTAUTH_SECRET?.length} chars)`,
  '❌ NEXTAUTH_SECRET missing or too short (need at least 32 chars)'
);

// Google OAuth
check(
  'GOOGLE_CLIENT_ID',
  !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com'),
  '✅ Google OAuth Client ID found',
  '❌ GOOGLE_CLIENT_ID missing or invalid'
);

check(
  'GOOGLE_CLIENT_SECRET',
  !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.length > 20,
  '✅ Google OAuth Client Secret set',
  '❌ GOOGLE_CLIENT_SECRET missing'
);

// GitHub OAuth
check(
  'GITHUB_CLIENT_ID',
  !!process.env.GITHUB_CLIENT_ID,
  '✅ GitHub OAuth Client ID found',
  '❌ GITHUB_CLIENT_ID missing'
);

check(
  'GITHUB_CLIENT_SECRET',
  !!process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CLIENT_SECRET.length > 20,
  '✅ GitHub OAuth Client Secret set',
  '❌ GITHUB_CLIENT_SECRET missing'
);

// AWS S3
check(
  'AWS_REGION',
  !!process.env.AWS_REGION,
  `✅ AWS Region: ${process.env.AWS_REGION}`,
  '❌ AWS_REGION missing'
);

check(
  'AWS_ACCESS_KEY_ID',
  !!process.env.AWS_ACCESS_KEY_ID,
  '✅ AWS Access Key ID set',
  '❌ AWS_ACCESS_KEY_ID missing'
);

check(
  'AWS_SECRET_ACCESS_KEY',
  !!process.env.AWS_SECRET_ACCESS_KEY,
  '✅ AWS Secret Access Key set',
  '❌ AWS_SECRET_ACCESS_KEY missing'
);

check(
  'AWS_S3_BUCKET',
  !!process.env.AWS_S3_BUCKET,
  `✅ S3 Bucket: ${process.env.AWS_S3_BUCKET}`,
  '❌ AWS_S3_BUCKET missing'
);

// Gemini API
check(
  'GOOGLE_GEMINI_API_KEY',
  !!process.env.GOOGLE_GEMINI_API_KEY,
  '✅ Google Gemini API Key set',
  '❌ GOOGLE_GEMINI_API_KEY missing'
);

// Print results
console.log('═══════════════════════════════════════════════════════\n');

let hasErrors = false;
let hasWarnings = false;

results.forEach(result => {
  const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
  console.log(`${icon} ${result.name}`);
  console.log(`   ${result.message}\n`);

  if (result.status === 'fail') hasErrors = true;
  if (result.status === 'warn') hasWarnings = true;
});

console.log('═══════════════════════════════════════════════════════\n');

const passCount = results.filter(r => r.status === 'pass').length;
const failCount = results.filter(r => r.status === 'fail').length;
const warnCount = results.filter(r => r.status === 'warn').length;

console.log(`📊 Results: ${passCount} passed, ${failCount} failed, ${warnCount} warnings\n`);

if (hasErrors) {
  console.log('❌ Environment setup incomplete. Please check SETUP.md for instructions.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Environment setup complete with warnings.\n');
} else {
  console.log('✅ All environment variables configured correctly!\n');
  console.log('Next steps:');
  console.log('  1. npx prisma db push');
  console.log('  2. npm run dev');
  console.log('  3. Visit http://localhost:3000\n');
}
