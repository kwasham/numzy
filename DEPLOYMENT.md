# Numzy Deployment Guide

This guide explains how to deploy the Numzy receipt management application to Vercel with both the Next.js frontend and Python backend.

## Architecture

- **Frontend**: Next.js application with Convex database
- **Backend**: Python FastAPI server for receipt processing
- **Deployment**: Vercel (supports both Node.js and Python)
- **Database**: Convex for receipts and metadata
- **Authentication**: Clerk
- **File Storage**: Convex file storage

## Prerequisites

1. GitHub account
2. Vercel account
3. Convex account (already set up)
4. Clerk account (already set up)

## Deployment Steps

### 1. Push to GitHub

```bash
# Add all files to git
git add .

# Commit changes
git commit -m "Add Python API and Vercel deployment configuration"

# Create GitHub repository and push
# (Replace with your actual repository URL)
git remote add origin https://github.com/yourusername/numzy.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect:
   - Next.js framework
   - Python functions in `/api` directory
5. Configure environment variables in Vercel dashboard:

#### Required Environment Variables

```bash
# Convex
CONVEX_DEPLOYMENT=dev:resolute-orca-5
NEXT_PUBLIC_CONVEX_URL=https://resolute-orca-5.convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Schematic
NEXT_PUBLIC_SCHEMATIC_KEY=api_...

# API Configuration
NEXT_PUBLIC_API_URL=/api
```

### 3. Verify Deployment

After deployment, verify that:

1. **Frontend works**: Visit your Vercel URL
2. **Python API works**: Visit `https://your-app.vercel.app/api/health`
3. **Receipt processing works**: Upload a test receipt

## Local Development Setup

### Running Both Frontend and Backend

1. **Install Node.js dependencies**:

```bash
npm install
```

2. **Set up Python environment**:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

3. **Start development servers**:

```bash
# Terminal 1: Start Next.js frontend
npm run dev

# Terminal 2: Start Python API server
cd api
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

4. **Start Convex**:

```bash
# Terminal 3: Start Convex
npx convex dev
```

## File Structure

```
numzy/
├── api/                          # Python FastAPI backend
│   ├── main.py                   # Main API endpoints
│   ├── receipt_processor.py      # Receipt processing logic
│   └── __pycache__/             # Python cache
├── app/                          # Next.js app directory
├── components/                   # React components
├── convex/                       # Convex backend
├── lib/                          # Utility libraries
│   ├── receiptAPI.ts            # Python API client
│   ├── imageCompression.ts      # Image compression utilities
│   └── utils.ts                 # General utilities
├── public/                       # Static assets
├── vercel.json                   # Vercel configuration
├── requirements.txt              # Python dependencies
├── package.json                  # Node.js dependencies
└── next.config.ts               # Next.js configuration
```

## Key Configuration Files

### vercel.json

Configures Vercel to handle Python functions:

```json
{
  "functions": {
    "api/**.py": {
      "runtime": "python3.9"
    }
  },
  "builds": [
    {
      "src": "api/**.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

### next.config.ts

Configures API proxying for development:

```typescript
{
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:8000/api/:path*'
            : '/api/:path*',
      },
    ];
  },
}
```

## API Endpoints

### Python API (FastAPI)

- `GET /api/health` - Health check
- `POST /api/process-receipt` - Process uploaded receipt
- `POST /api/validate-receipt` - Validate receipt data
- `GET /api/receipt/{id}` - Get receipt by ID

### Usage Example

```typescript
import { receiptAPI } from '@/lib/receiptAPI';

// Process a receipt
const result = await receiptAPI.processReceipt(file);
if (result.success) {
  console.log('Processed data:', result.data);
}
```

## Troubleshooting

### Common Issues

1. **Python dependencies not installing**:
   - Check `requirements.txt` format
   - Ensure Python version compatibility

2. **API routes not working**:
   - Verify `vercel.json` configuration
   - Check function deployment logs in Vercel dashboard

3. **CORS issues**:
   - Update CORS settings in `api/main.py`
   - Check Vercel domain configuration

4. **Environment variables**:
   - Ensure all required env vars are set in Vercel
   - Check variable names match exactly

### Monitoring

- **Vercel Dashboard**: Monitor deployments and function logs
- **Convex Dashboard**: Monitor database operations
- **Clerk Dashboard**: Monitor authentication

## Performance Considerations

1. **Python Function Cold Starts**: Vercel Python functions may have cold start delays
2. **File Upload Limits**: Vercel has file size limits for uploads
3. **Function Timeouts**: Serverless functions have execution time limits

## Security

1. **API Keys**: Never commit API keys to version control
2. **CORS**: Configure properly for production domains
3. **File Validation**: Validate uploaded files server-side
4. **Rate Limiting**: Consider implementing rate limiting for API endpoints

## Next Steps

1. Add your existing Python receipt processing logic to `api/receipt_processor.py`
2. Update the mock data in `api/main.py` with real processing
3. Add error monitoring (e.g., Sentry)
4. Implement caching for better performance
5. Add automated testing for API endpoints
