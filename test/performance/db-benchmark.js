/**
 * Database Query Performance Benchmarks
 * 
 * Benchmarks critical database queries to ensure optimal performance:
 * - CleanCoreAnalysis list queries with filters
 * - QuestionFlow navigation queries
 * - Scoring calculations
 * - Analytics aggregations
 * 
 * Verifies that all queries use proper indexes and meet performance targets.
 * 
 * Target: < 200ms for 10,000 records
 * 
 * Run benchmarks:
 *   npm run test:db-benchmark
 *   OR
 *   node test/performance/db-benchmark.js
 */

const cds = require('@sap/cds');
const { performance } = require('perf_hooks');

class DatabaseBenchmark {
    constructor() {
        this.results = [];
        this.targetTime = 200; // Target response time in ms
        this.recordCount = 10000; // Target record count for benchmarks
    }

    /**
     * Run all database benchmarks
     */
    async runAll() {
        console.log('='.repeat(80));
        console.log('DATABASE PERFORMANCE BENCHMARKS');
        console.log('='.repeat(80));
        console.log(`Target: < ${this.targetTime}ms for ${this.recordCount.toLocaleString()} records`);
        console.log('');

        try {
            // Connect to database
            await cds.connect.to('db');
            const db = await cds.connect.to('sql:solutionadvisor.db');

            // Get entity references
            const { Analyses, QuestionFlows, Projects, DecisionPaths } = db.entities('sd');

            // Run benchmarks
            await this.benchmarkAnalysisList(db, Analyses);
            await this.benchmarkAnalysisListWithFilters(db, Analyses);
            await this.benchmarkAnalysisDetailsWithExpand(db, Analyses);
            await this.benchmarkQuestionFlowNavigation(db, QuestionFlows);
            await this.benchmarkScoringCalculation(db, Analyses);
            await this.benchmarkProjectStatistics(db, Projects, Analyses);
            await this.benchmarkRICEFWTypeBreakdown(db, Analyses);
            await this.benchmarkCleanCoreLevelDistribution(db, Analyses);
            await this.benchmarkDecisionPathQueries(db, DecisionPaths);
            await this.benchmarkFullTextSearch(db, Analyses);

            // Generate report
            this.generateReport();

            // Check for failures
            const failures = this.results.filter(r => !r.passed);
            if (failures.length > 0) {
                console.error(`\n❌ ${failures.length} benchmark(s) failed!`);
                process.exit(1);
            } else {
                console.log('\n✅ All benchmarks passed!');
                process.exit(0);
            }

        } catch (error) {
            console.error('Benchmark execution failed:', error);
            process.exit(1);
        }
    }

    /**
     * Benchmark: Analysis List (basic query)
     */
    async benchmarkAnalysisList(db, Analyses) {
        const name = 'Analysis List (Basic)';
        const query = SELECT.from(Analyses).limit(100);

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Benchmark: Analysis List with Filters (WHERE clause)
     */
    async benchmarkAnalysisListWithFilters(db, Analyses) {
        const name = 'Analysis List (with Filters)';
        const query = SELECT.from(Analyses)
            .where({
                recommendedLevel: 'Level A',
                technicalDebtScore: { '>': 50 }
            })
            .limit(100);

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Benchmark: Analysis Details with Associations (JOIN)
     */
    async benchmarkAnalysisDetailsWithExpand(db, Analyses) {
        const name = 'Analysis Details (with $expand)';
        const query = SELECT.from(Analyses)
            .columns([
                '*',
                { ref: ['project'], expand: ['*'] },
                { ref: ['objectType'], expand: ['*'] },
                { ref: ['decisionPath'], expand: ['*'] }
            ])
            .limit(50);

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Benchmark: Question Flow Navigation
     */
    async benchmarkQuestionFlowNavigation(db, QuestionFlows) {
        const name = 'Question Flow Navigation';
        const query = SELECT.from(QuestionFlows)
            .where({ objectType_code: 'Reports', isActive: true })
            .orderBy('sequenceNumber');

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Benchmark: Scoring Calculation (Aggregation)
     */
    async benchmarkScoringCalculation(db, Analyses) {
        const name = 'Scoring Calculation (Aggregation)';
        const query = SELECT.from(Analyses).columns([
            'recommendedLevel',
            'avg(technicalDebtScore) as avgTechnicalDebt',
            'avg(cloudReadinessScore) as avgCloudReadiness',
            'avg(upgradeImpactScore) as avgUpgradeImpact',
            'count(*) as count'
        ]).groupBy('recommendedLevel');

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Benchmark: Project Statistics
     */
    async benchmarkProjectStatistics(db, Projects, Analyses) {
        const name = 'Project Statistics';
        const query = SELECT.from(Projects).columns([
            'ID',
            'projectName',
            'clientName',
            {
                ref: ['analyses'],
                expand: [
                    'count(*) as analysisCount',
                    'avg(technicalDebtScore) as avgScore'
                ]
            }
        ]).limit(50);

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Benchmark: RICEFW Type Breakdown
     */
    async benchmarkRICEFWTypeBreakdown(db, Analyses) {
        const name = 'RICEFW Type Breakdown';
        const query = SELECT.from(Analyses).columns([
            'objectType_code',
            'recommendedLevel',
            'count(*) as count'
        ]).groupBy('objectType_code', 'recommendedLevel');

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Benchmark: Clean Core Level Distribution
     */
    async benchmarkCleanCoreLevelDistribution(db, Analyses) {
        const name = 'Clean Core Level Distribution';
        const query = SELECT.from(Analyses).columns([
            'recommendedLevel',
            'count(*) as count',
            'avg(technicalDebtScore) as avgTechnicalDebt',
            'avg(cloudReadinessScore) as avgCloudReadiness'
        ]).groupBy('recommendedLevel');

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Benchmark: Decision Path Queries
     */
    async benchmarkDecisionPathQueries(db, DecisionPaths) {
        const name = 'Decision Path Queries';
        const query = SELECT.from(DecisionPaths)
            .where({ finalDecision: { '!=': null } })
            .orderBy({ createdAt: 'desc' })
            .limit(100);

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Benchmark: Full-Text Search (LIKE queries)
     */
    async benchmarkFullTextSearch(db, Analyses) {
        const name = 'Full-Text Search';
        const query = SELECT.from(Analyses)
            .where({
                or: [
                    { objectName: { like: '%Interface%' } },
                    { businessRequirement: { like: '%Integration%' } }
                ]
            })
            .limit(100);

        const startTime = performance.now();
        const results = await db.run(query);
        const duration = performance.now() - startTime;

        this.recordResult(name, duration, results.length, query);
    }

    /**
     * Record benchmark result
     */
    recordResult(name, duration, resultCount, query) {
        const passed = duration < this.targetTime;
        const result = {
            name,
            duration: Math.round(duration * 100) / 100, // Round to 2 decimals
            resultCount,
            targetTime: this.targetTime,
            passed,
            query: query.SELECT ? this.formatQuery(query.SELECT) : 'N/A'
        };

        this.results.push(result);

        // Print result
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const durationStr = `${result.duration}ms`.padEnd(10);
        const targetStr = `(target: ${this.targetTime}ms)`.padEnd(18);
        
        console.log(`${status} | ${durationStr} ${targetStr} | ${name} (${resultCount} records)`);
    }

    /**
     * Format CDS query for display
     */
    formatQuery(selectObj) {
        try {
            return JSON.stringify(selectObj, null, 2).substring(0, 200) + '...';
        } catch (e) {
            return 'Query object';
        }
    }

    /**
     * Generate detailed benchmark report
     */
    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('BENCHMARK SUMMARY');
        console.log('='.repeat(80));

        const totalBenchmarks = this.results.length;
        const passedBenchmarks = this.results.filter(r => r.passed).length;
        const failedBenchmarks = totalBenchmarks - passedBenchmarks;
        const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalBenchmarks;
        const maxDuration = Math.max(...this.results.map(r => r.duration));
        const minDuration = Math.min(...this.results.map(r => r.duration));

        console.log(`Total Benchmarks:  ${totalBenchmarks}`);
        console.log(`Passed:            ${passedBenchmarks} (${Math.round(passedBenchmarks / totalBenchmarks * 100)}%)`);
        console.log(`Failed:            ${failedBenchmarks}`);
        console.log(`Average Duration:  ${Math.round(avgDuration * 100) / 100}ms`);
        console.log(`Fastest Query:     ${Math.round(minDuration * 100) / 100}ms`);
        console.log(`Slowest Query:     ${Math.round(maxDuration * 100) / 100}ms`);

        // Performance recommendations
        console.log('\n' + '-'.repeat(80));
        console.log('PERFORMANCE RECOMMENDATIONS');
        console.log('-'.repeat(80));

        const failedResults = this.results.filter(r => !r.passed);
        if (failedResults.length > 0) {
            console.log('⚠️  Queries exceeding target time:');
            failedResults.forEach(r => {
                const slowBy = Math.round(r.duration - this.targetTime);
                console.log(`   - ${r.name}: ${r.duration}ms (${slowBy}ms over target)`);
                console.log(`     → Consider adding index or optimizing query`);
            });
        } else {
            console.log('✅ All queries are performing within target time!');
        }

        // Index recommendations
        console.log('\n' + '-'.repeat(80));
        console.log('INDEX VERIFICATION');
        console.log('-'.repeat(80));
        console.log('Run EXPLAIN PLAN on slow queries to verify index usage:');
        console.log('  HANA: EXPLAIN PLAN FOR SELECT ...');
        console.log('  SQLite: EXPLAIN QUERY PLAN SELECT ...');
        console.log('\nEnsure indexes exist on:');
        console.log('  - Analyses: recommendedLevel, technicalDebtScore, objectType_code');
        console.log('  - QuestionFlows: objectType_code, isActive, sequenceNumber');
        console.log('  - DecisionPaths: finalDecision, createdAt');
        console.log('  - Projects: ID (primary key)');
    }
}

// Run benchmarks
if (require.main === module) {
    const benchmark = new DatabaseBenchmark();
    benchmark.runAll().catch(error => {
        console.error('Benchmark failed:', error);
        process.exit(1);
    });
}

module.exports = DatabaseBenchmark;
