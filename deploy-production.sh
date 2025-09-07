#!/bin/bash

# 🚀 FormDee Production Deployment Script
# Version: 1.0.0

set -e

echo "🚀 FormDee Production Deployment Starting..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Step 1: Environment Check
print_info "Step 1: Checking environment..."

if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    exit 1
fi

if [ ! -f "package.json" ]; then
    print_error "package.json not found! Are you in the right directory?"
    exit 1
fi

print_status "Environment files found"

# Step 2: Quality Checks
print_info "Step 2: Running quality checks..."

echo "  - Linting code..."
if npm run lint --silent; then
    print_status "Code linting passed"
else
    print_error "Code linting failed!"
    exit 1
fi

echo "  - TypeScript check..."
if npm run typecheck --silent; then
    print_status "TypeScript check passed"
else
    print_error "TypeScript check failed!"
    exit 1
fi

# Step 3: Production Build
print_info "Step 3: Building for production..."

if npm run build; then
    print_status "Production build successful"
else
    print_error "Production build failed!"
    exit 1
fi

# Step 4: Production Environment Setup
print_info "Step 4: Setting up production environment..."

if [ -f ".env.production" ]; then
    print_status "Production environment file found"
    print_warning "Please ensure .env.production has the correct NEXT_PUBLIC_BASE_URL for your domain"
else
    print_warning "No .env.production file found. Using .env for production"
fi

# Step 5: Deployment Options
print_info "Step 5: Choose your deployment option:"
echo ""
echo "Choose deployment method:"
echo "1) 🐳 Docker (Recommended)"
echo "2) ☁️  Vercel" 
echo "3) 🖥️  Manual/VPS"
echo "4) ❌ Cancel"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        print_info "Deploying with Docker..."
        
        # Check if Docker is available
        if ! command -v docker &> /dev/null; then
            print_error "Docker is not installed!"
            print_info "Please install Docker and try again"
            exit 1
        fi
        
        print_info "Building Docker image..."
        if docker build -t formdee-production .; then
            print_status "Docker image built successfully"
        else
            print_error "Docker build failed!"
            exit 1
        fi
        
        print_info "Starting production container..."
        docker stop formdee-prod 2>/dev/null || true
        docker rm formdee-prod 2>/dev/null || true
        
        if docker run -d --name formdee-prod -p 3000:3000 --env-file .env formdee-production; then
            print_status "Production container started successfully!"
            print_status "Application is running at: http://localhost:3000"
            
            # Health check
            sleep 5
            if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
                print_status "Health check passed!"
            else
                print_warning "Health check failed. Container might still be starting..."
            fi
            
            echo ""
            echo "📋 Container Management Commands:"
            echo "  - View logs:     docker logs formdee-prod"
            echo "  - Stop:          docker stop formdee-prod"
            echo "  - Start:         docker start formdee-prod"
            echo "  - Restart:       docker restart formdee-prod"
            echo "  - Remove:        docker rm -f formdee-prod"
        else
            print_error "Failed to start production container!"
            exit 1
        fi
        ;;
    2)
        print_info "Deploying to Vercel..."
        
        if ! command -v vercel &> /dev/null; then
            print_warning "Vercel CLI not found. Installing..."
            npm install -g vercel
        fi
        
        print_info "Starting Vercel deployment..."
        print_warning "Make sure to set these environment variables in Vercel dashboard:"
        echo "  - GAS_BASE_URL"
        echo "  - ADMIN_API_KEY" 
        echo "  - ADMIN_UI_KEY"
        echo "  - NEXT_PUBLIC_BASE_URL"
        echo ""
        
        if vercel --prod; then
            print_status "Deployed to Vercel successfully!"
        else
            print_error "Vercel deployment failed!"
            exit 1
        fi
        ;;
    3)
        print_info "Manual deployment selected"
        print_status "Production build completed!"
        echo ""
        echo "📋 Manual Deployment Instructions:"
        echo "1. Copy the entire project to your server"
        echo "2. Install dependencies: npm install --production"
        echo "3. Set environment variables on your server"
        echo "4. Start the application: npm start"
        echo "5. The app will run on port 3000"
        echo ""
        echo "💡 For PM2 process management:"
        echo "   pm2 start npm --name 'formdee' -- start"
        ;;
    4)
        print_info "Deployment cancelled"
        exit 0
        ;;
    *)
        print_error "Invalid choice!"
        exit 1
        ;;
esac

# Final Status
echo ""
echo "================================================"
print_status "FormDee Production Deployment Complete!"
echo ""
print_info "🔧 Post-Deployment Checklist:"
echo "  ✓ Build successful"
echo "  ✓ Quality checks passed"
echo "  ✓ Production deployment ready"
echo ""
print_warning "📝 Don't forget to:"
echo "  • Test form creation at /builder"
echo "  • Test form submission"
echo "  • Verify Google Sheets integration" 
echo "  • Test file uploads (if configured)"
echo "  • Check admin authentication"
echo ""
print_status "🎉 FormDee is ready for production use!"