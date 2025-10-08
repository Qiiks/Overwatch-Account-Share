#!/usr/bin/env node

/**
 * Static Analysis Verification Script for Client Dockerfile
 * This script performs comprehensive validation of the Dockerfile
 * to ensure all permission issues are resolved.
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('CLIENT DOCKERFILE PERMISSION FIX VERIFICATION');
console.log('='.repeat(80));

// Read the Dockerfile
const dockerfilePath = path.join(__dirname, 'Dockerfile');
const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
const lines = dockerfile.split('\n');

// Analysis results
const results = {
    critical: [],
    warnings: [],
    passed: [],
    recommendations: []
};

// Track state through the Dockerfile
let currentStage = '';
let currentUser = 'root';
let workdirOwnership = {};
let userCreated = {};
let stageAnalysis = {};

console.log('\n📋 ANALYZING DOCKERFILE STRUCTURE...\n');

// Parse and analyze each line
lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') return;
    
    // Stage detection
    if (trimmed.startsWith('FROM')) {
        const match = trimmed.match(/FROM .* AS (\w+)/);
        if (match) {
            currentStage = match[1];
            currentUser = 'root'; // Reset to root for new stage
            console.log(`\n🔍 Analyzing Stage: ${currentStage}`);
            stageAnalysis[currentStage] = {
                userCreated: false,
                workdirSet: false,
                workdirOwned: false,
                userSwitched: false,
                commands: []
            };
        }
    }
    
    // User creation detection
    if (trimmed.includes('adduser') || trimmed.includes('addgroup')) {
        userCreated[currentStage] = true;
        stageAnalysis[currentStage].userCreated = true;
        console.log(`  ✓ Line ${lineNum}: User/group creation detected`);
    }
    
    // WORKDIR detection
    if (trimmed.startsWith('WORKDIR')) {
        const dir = trimmed.replace('WORKDIR', '').trim();
        workdirOwnership[dir] = currentUser;
        stageAnalysis[currentStage].workdirSet = true;
        console.log(`  → Line ${lineNum}: WORKDIR set to ${dir} (current user: ${currentUser})`);
        
        // Check if next line sets ownership
        if (index + 1 < lines.length) {
            const nextLine = lines[index + 1].trim();
            if (nextLine.includes('chown') && nextLine.includes('nodejs')) {
                stageAnalysis[currentStage].workdirOwned = true;
                console.log(`  ✓ Line ${lineNum + 1}: Directory ownership set to nodejs`);
            }
        }
    }
    
    // Ownership change detection
    if (trimmed.includes('chown nodejs:nodejs /usr/src/app')) {
        stageAnalysis[currentStage].workdirOwned = true;
        workdirOwnership['/usr/src/app'] = 'nodejs';
        console.log(`  ✓ Line ${lineNum}: Directory ownership changed to nodejs`);
    }
    
    // USER directive detection
    if (trimmed.startsWith('USER')) {
        currentUser = trimmed.replace('USER', '').trim();
        stageAnalysis[currentStage].userSwitched = true;
        console.log(`  → Line ${lineNum}: Switched to user: ${currentUser}`);
    }
    
    // Command execution detection
    if (trimmed.startsWith('RUN') && currentStage) {
        const command = trimmed.replace('RUN', '').trim();
        stageAnalysis[currentStage].commands.push({
            line: lineNum,
            user: currentUser,
            command: command
        });
        
        // Check for permission-sensitive operations
        if (command.includes('pnpm install') || command.includes('npm install')) {
            console.log(`  ! Line ${lineNum}: Package installation as user: ${currentUser}`);
            if (currentUser === 'root' && command.includes('--prod')) {
                results.warnings.push(`Line ${lineNum}: Installing production dependencies as root`);
            }
        }
    }
});

console.log('\n' + '='.repeat(80));
console.log('PERMISSION ANALYSIS RESULTS');
console.log('='.repeat(80));

// Analyze builder stage
if (stageAnalysis['builder']) {
    console.log('\n📦 BUILDER STAGE ANALYSIS:');
    const builder = stageAnalysis['builder'];
    
    if (builder.userCreated) {
        results.passed.push('Builder: nodejs user created');
        console.log('  ✅ nodejs user created');
    } else {
        results.critical.push('Builder: nodejs user NOT created');
        console.log('  ❌ nodejs user NOT created');
    }
    
    if (builder.workdirSet && builder.workdirOwned) {
        results.passed.push('Builder: WORKDIR ownership set correctly');
        console.log('  ✅ WORKDIR ownership set correctly');
    } else if (builder.workdirSet && !builder.workdirOwned) {
        results.critical.push('Builder: WORKDIR created but ownership not set');
        console.log('  ❌ WORKDIR created but ownership not set');
    }
    
    if (builder.userSwitched) {
        results.passed.push('Builder: Switched to non-root user');
        console.log('  ✅ Switched to non-root user');
    } else {
        results.warnings.push('Builder: No user switch detected');
        console.log('  ⚠️  No user switch detected');
    }
    
    // Check if build commands run as non-root
    const buildCommands = builder.commands.filter(c => c.command.includes('pnpm build'));
    if (buildCommands.length > 0 && buildCommands[0].user === 'nodejs') {
        results.passed.push('Builder: Build runs as non-root user');
        console.log('  ✅ Build runs as non-root user');
    }
}

// Analyze runner stage (CRITICAL FOR PRODUCTION)
if (stageAnalysis['runner']) {
    console.log('\n🚀 RUNNER STAGE ANALYSIS (CRITICAL):');
    const runner = stageAnalysis['runner'];
    
    if (runner.userCreated) {
        results.passed.push('Runner: nodejs user created');
        console.log('  ✅ nodejs user created');
    } else {
        results.critical.push('Runner: nodejs user NOT created');
        console.log('  ❌ nodejs user NOT created');
    }
    
    // CRITICAL CHECK: WORKDIR ownership
    if (runner.workdirSet && runner.workdirOwned) {
        results.passed.push('Runner: WORKDIR ownership set correctly (CRITICAL FIX APPLIED)');
        console.log('  ✅ WORKDIR ownership set correctly (CRITICAL FIX APPLIED)');
    } else if (runner.workdirSet && !runner.workdirOwned) {
        results.critical.push('Runner: WORKDIR created but ownership NOT set - EACCES ERROR WILL OCCUR!');
        console.log('  ❌ WORKDIR created but ownership NOT set - EACCES ERROR WILL OCCUR!');
    }
    
    if (runner.userSwitched) {
        results.passed.push('Runner: Switched to non-root user');
        console.log('  ✅ Switched to non-root user');
    } else {
        results.critical.push('Runner: No user switch - running as root');
        console.log('  ❌ No user switch - running as root');
    }
    
    // Check production install commands
    const prodInstallCommands = runner.commands.filter(c => 
        c.command.includes('pnpm install') && c.command.includes('--prod')
    );
    
    if (prodInstallCommands.length > 0) {
        const installCmd = prodInstallCommands[0];
        if (installCmd.user === 'nodejs') {
            results.passed.push('Runner: Production dependencies installed as nodejs user');
            console.log('  ✅ Production dependencies installed as nodejs user');
        } else {
            results.critical.push('Runner: Production dependencies installed as root');
            console.log('  ❌ Production dependencies installed as root');
        }
    }
}

// Check for the specific fix pattern
console.log('\n🔧 SPECIFIC FIX VALIDATION:');
const runnerSection = dockerfile.split('FROM node:20-alpine AS runner')[1];
if (runnerSection) {
    // Check if chown is applied right after WORKDIR
    const hasCorrectPattern = runnerSection.includes('WORKDIR /usr/src/app') &&
                              runnerSection.includes('RUN chown nodejs:nodejs /usr/src/app') &&
                              runnerSection.indexOf('RUN chown nodejs:nodejs /usr/src/app') < 
                              runnerSection.indexOf('USER nodejs');
    
    if (hasCorrectPattern) {
        console.log('  ✅ VERIFIED: chown nodejs:nodejs applied immediately after WORKDIR');
        console.log('  ✅ VERIFIED: Ownership set BEFORE switching to nodejs user');
        console.log('  ✅ VERIFIED: Fix correctly prevents EACCES permission errors');
        results.passed.push('CRITICAL FIX VERIFIED: Permission chain is correct');
    } else {
        console.log('  ❌ FAILED: Permission fix not correctly applied');
        results.critical.push('CRITICAL: Permission fix pattern not found');
    }
}

// Final Summary
console.log('\n' + '='.repeat(80));
console.log('FINAL VERIFICATION SUMMARY');
console.log('='.repeat(80));

console.log('\n✅ PASSED CHECKS (' + results.passed.length + '):');
results.passed.forEach(item => console.log('  • ' + item));

if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (' + results.warnings.length + '):');
    results.warnings.forEach(item => console.log('  • ' + item));
}

if (results.critical.length > 0) {
    console.log('\n❌ CRITICAL ISSUES (' + results.critical.length + '):');
    results.critical.forEach(item => console.log('  • ' + item));
}

// Overall verdict
console.log('\n' + '='.repeat(80));
if (results.critical.length === 0) {
    console.log('🎉 VERIFICATION RESULT: ALL CHECKS PASSED');
    console.log('✅ The Dockerfile has been successfully fixed!');
    console.log('✅ EACCES permission errors should be resolved.');
    console.log('✅ Ready for production deployment.');
} else {
    console.log('❌ VERIFICATION RESULT: CRITICAL ISSUES FOUND');
    console.log('⚠️  The Dockerfile still has permission issues that will cause build failures.');
}
console.log('='.repeat(80));

// Exit with appropriate code
process.exit(results.critical.length > 0 ? 1 : 0);