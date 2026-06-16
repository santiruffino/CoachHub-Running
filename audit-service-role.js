const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = '/Users/santiruffino/Documents/MyProjects/Endurix/frontend';
const SRC_DIR = path.join(FRONTEND_ROOT, 'src');

function findFiles(dir, pattern) {
  const results = [];
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        if (pattern.test(entry.name)) results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

function extractRouteInfo(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // Find all createServiceRoleClient usages with context
  const lines = content.split('\n');
  const usages = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('createServiceRoleClient')) {
      // Get context (5 lines before and after)
      const start = Math.max(0, i - 5);
      const end = Math.min(lines.length, i + 10);
      const context = lines.slice(start, end).join('\n');
      
      // Find the function/method this is in
      let functionName = 'unknown';
      for (let j = i; j >= 0; j--) {
        const match = lines[j].match(/export async function (\w+)|async (\w+)\s*\(/);
        if (match) {
          functionName = match[1] || match[2];
          break;
        }
      }
      
      usages.push({
        line: i + 1,
        function: functionName,
        context: context.trim()
      });
    }
  }
  
  // Check for requireAuth/requireRole
  const hasRequireAuth = content.includes('requireAuth()');
  const hasRequireRole = content.includes('requireRole(');
  const hasGetAuthenticatedUser = content.includes('getAuthenticatedUser()');
  
  // Check for ownership checks
  const hasOwnerCheck = content.includes('user!.id === ') || 
                        content.includes('user.id === ') ||
                        content.includes('activityOwnerId') ||
                        content.includes('athleteId') ||
                        content.includes('targetUserId');
  
  // Check for team membership checks
  const hasTeamCheck = content.includes('team_id') && 
                       (content.includes('profile.team_id') || 
                        content.includes('athleteProfile.team_id') ||
                        content.includes('coachProfile.team_id'));
  
  // Check for role checks
  const hasRoleCheck = content.includes('profile?.role') || 
                       content.includes('requesterProfile.role') ||
                       content.includes('user!.role');
  
  return {
    file: relativePath,
    usages,
    auth: {
      requireAuth: hasRequireAuth,
      requireRole: hasRequireRole,
      getAuthenticatedUser: hasGetAuthenticatedUser
    },
    checks: {
      ownership: hasOwnerCheck,
      team: hasTeamCheck,
      role: hasRoleCheck
    }
  };
}

// Find all API routes
const apiDir = path.join(SRC_DIR, 'app', 'api');
const apiFiles = findFiles(apiDir, /route\.ts$/);

console.log(`Found ${apiFiles.length} API route files\n`);

const auditResults = [];
let totalUsages = 0;

for (const file of apiFiles) {
  const info = extractRouteInfo(file);
  if (info.usages.length > 0) {
    totalUsages += info.usages.length;
    auditResults.push(info);
  }
}

// Sort by file path
auditResults.sort((a, b) => a.file.localeCompare(b.file));

// Generate report
console.log('='.repeat(100));
console.log('SERVICE ROLE CLIENT AUDIT REPORT');
console.log('='.repeat(100));
console.log(`Total API routes using createServiceRoleClient: ${auditResults.length}`);
console.log(`Total call sites: ${totalUsages}\n`);

for (const result of auditResults) {
  console.log(`\n📁 ${result.file}`);
  console.log(`   Auth: requireAuth=${result.auth.requireAuth} | requireRole=${result.auth.requireRole} | getAuthUser=${result.auth.getAuthenticatedUser}`);
  console.log(`   Checks: ownership=${result.checks.ownership} | team=${result.checks.team} | role=${result.checks.role}`);
  
  for (const usage of result.usages) {
    console.log(`   └─ Line ${usage.line} in ${usage.function}()`);
  }
}

// Summary by risk level
console.log('\n' + '='.repeat(100));
console.log('RISK ASSESSMENT');
console.log('='.repeat(100));

const highRisk = [];
const mediumRisk = [];
const lowRisk = [];

for (const result of auditResults) {
  const hasAuth = result.auth.requireAuth || result.auth.requireRole;
  const hasOwnership = result.checks.ownership;
  const hasTeam = result.checks.team;
  
  if (!hasAuth) {
    highRisk.push(result.file);
  } else if (hasAuth && hasOwnership && (hasTeam || result.file.includes('strava/webhook'))) {
    lowRisk.push(result.file);
  } else {
    mediumRisk.push(result.file);
  }
}

console.log(`\n🔴 HIGH RISK (no auth): ${highRisk.length}`);
highRisk.forEach(f => console.log(`   - ${f}`));

console.log(`\n🟡 MEDIUM RISK (auth but incomplete checks): ${mediumRisk.length}`);
mediumRisk.forEach(f => console.log(`   - ${f}`));

console.log(`\n🟢 LOW RISK (auth + ownership + team): ${lowRisk.length}`);
lowRisk.forEach(f => console.log(`   - ${f}`));

// Output JSON for further processing
const outputPath = path.join(FRONTEND_ROOT, 'service-role-audit.json');
fs.writeFileSync(outputPath, JSON.stringify({ auditResults, summary: { highRisk, mediumRisk, lowRisk, totalUsages } }, null, 2));
console.log(`\n📄 Full report saved to: ${outputPath}`);
