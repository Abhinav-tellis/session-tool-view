import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Manual sync started...');
    
    // Run the testMongoDB.ts script which has all the functionality
    const { stdout, stderr } = await execAsync('npx tsx testMongoDB.ts', {
      cwd: process.cwd().replace(/frontend$/, ''), // Remove 'frontend' from the path to go to root
      timeout: 300000, // 5 minutes timeout
      env: { ...process.env }
    });
    
    console.log('Sync output:', stdout);
    if (stderr && !stderr.includes('deprecation warning')) {
      console.log('Sync stderr:', stderr);
    }
    
    // Parse the output to get statistics
    const lines = stdout.split('\n');
    let totalDocuments = 0;
    let chunksProcessed = 0;
    let elapsedTime = '0s';
    let testsStatus = {
      environment: false,
      ollama: false,
      mongodb: false,
      processing: false,
      vectorOps: false
    };
    
    // Parse the output for various status information
    for (const line of lines) {
      // Look for document counts
      if (line.includes('Total documents in store:')) {
        const match = line.match(/(\d+)/);
        if (match) {
          totalDocuments = parseInt(match[1]);
        }
      }
      
      if (line.includes('Successfully added') && line.includes('documents to vector store')) {
        const match = line.match(/(\d+)/);
        if (match) {
          chunksProcessed = parseInt(match[1]);
        }
      }
      
      // Look for elapsed time
      if (line.includes('Total time:')) {
        const match = line.match(/(\d+\.\d+)s/);
        if (match) {
          elapsedTime = `${match[1]}s`;
        }
      }
      
      // Look for test status
      if (line.includes('PASS')) {
        if (line.includes('Environment Check')) testsStatus.environment = true;
        if (line.includes('Ollama Connection')) testsStatus.ollama = true;
        if (line.includes('MongoDB Connection')) testsStatus.mongodb = true;
        if (line.includes('Session Processing')) testsStatus.processing = true;
        if (line.includes('Vector Operations')) testsStatus.vectorOps = true;
      }
    }
    
    // Check if sync was successful based on output
    const isSuccess = stdout.includes('Overall: 5/5 tests passed') && !stdout.includes('FAIL');
    
    if (!isSuccess) {
      // Find error messages
      const errorLines = lines.filter(line => line.includes('FAIL') || line.includes('ERROR'));
      const errorMessage = errorLines.length > 0 ? errorLines.join('; ') : 'Unknown error occurred';
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        testsStatus,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    console.log(`✅ Sync completed in ${elapsedTime}! Total documents: ${totalDocuments}`);
    
    return NextResponse.json({
      success: true,
      message: chunksProcessed > 0 ? `Successfully synced ${chunksProcessed} new chunks` : 'All data is up to date',
      totalDocuments,
      chunksProcessed,
      elapsedTime,
      testsStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    
    // Try to parse error for more specific feedback
    let errorMessage = error.message;
    if (error.stderr) {
      errorMessage += `. Error details: ${error.stderr}`;
    }
    
    return NextResponse.json({
      success: false, 
      error: `Sync failed: ${errorMessage}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}