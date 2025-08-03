# PR Studio Application

## Overview

PR Studio is a comprehensive press release management application built with a modern full-stack architecture. The application enables users to generate AI-powered press releases, manage media contacts, and distribute content to journalists and publications. It features a React-based frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack TypeScript architecture with clear separation between client and server components:

- **Frontend**: React with TypeScript, built using Vite
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing

## Key Components

### Frontend Architecture
- **Component Structure**: Modular React components with TypeScript
- **UI System**: shadcn/ui component library providing consistent design patterns
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query for efficient server state management

### Backend Architecture
- **API Framework**: Express.js with TypeScript for type safety
- **Database Layer**: Drizzle ORM with PostgreSQL for data persistence
- **Storage Pattern**: Interface-based storage layer using DatabaseStorage with PostgreSQL
- **File Processing**: Multer for CSV file uploads and document processing for press release generation
- **Email Integration**: Nodemailer for press release distribution
- **AI Integration**: OpenAI GPT-4o for press release generation, editing, and document-based content creation

### Database Schema
- **Press Releases**: Core entity storing company info, headlines, content, and AI-generated releases with edit capabilities
- **Language Support**: Press releases include language field and originalId reference for translations
- **Contacts**: Media contact information including name, email, and publication
- **Advertisements**: Social media posts and ads generated from press releases with platform-specific content, AI-generated images, and editing capabilities
- **Timestamps**: Automatic creation tracking for all entities
- **AI Editing**: Press releases and advertisements can be updated through conversational AI interface or manual editing
- **Image Generation**: DALL-E 3 integration for creating platform-specific visual content
- **Translation System**: AI-powered translation with support for 15+ languages and proper format preservation

### External Integrations
- **OpenAI API**: GPT-4o model for AI-powered press release generation and advertisement content creation
- **DALL-E 3 API**: AI image generation for social media posts and advertisements
- **Email Service**: Gmail SMTP for automated distribution
- **File Upload**: CSV processing for bulk contact imports

## Data Flow

1. **Press Release Generation**: 
   - **Manual Entry**: User inputs company details → OpenAI processes content → Generated release stored in database
   - **Document Upload**: User uploads file (text format) → File content extracted → AI processes document + optional form inputs → Generated release stored
2. **Contact Management**: CSV upload → File processing → Bulk contact creation → Database storage
3. **Distribution**: Select release + contacts → Email composition → Nodemailer sends → Tracking stored
4. **Advertisement Creation**: Select press release + platform → OpenAI generates content + image prompt → Advertisement stored without image initially
5. **On-Demand Image Generation**: User clicks "Generate Image" → DALL-E creates image → Advertisement updated with image URL
6. **Advertisement Editing**: Manual text editing or AI-powered content modification → Updated content saved
7. **Image Regeneration**: User triggers image refresh → DALL-E creates new image → Updated advertisement saved
8. **Translation Workflow**: Select press release + target language → GPT-4o translates content → New translated version created and linked
9. **History Management**: Database queries → React Query caching → UI display with filtering and language badges

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **openai**: AI-powered content generation
- **nodemailer**: Email distribution capabilities
- **multer**: File upload handling
- **csv-parser**: CSV file processing

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **@hookform/resolvers**: Form validation integration
- **zod**: Runtime type validation

## Deployment Strategy

### Development Environment
- **Build Tools**: Vite for frontend bundling, esbuild for backend compilation
- **Development Server**: Concurrent frontend (Vite) and backend (tsx) servers
- **Database**: Drizzle Kit for schema management and migrations

### Production Considerations
- **Database**: PostgreSQL with connection pooling via Neon
- **Environment Variables**: OpenAI API key, database URL, email credentials
- **File Storage**: Local uploads directory (consider cloud storage for production)
- **Process Management**: Single Node.js process serving both API and static files

### Configuration Requirements
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API access for content generation
- `EMAIL_USER` and `EMAIL_PASS`: Gmail SMTP credentials for distribution
- Build outputs to `dist/` directory with separate public assets folder

## Recent Changes

### August 3, 2025 - File Upload & Enhanced Press Release Generation
- **Document Upload System**: Added file upload functionality as the first step in press release creation wizard
- **Smart Form Validation**: Form fields become optional when document is uploaded, with intelligent validation logic
- **Enhanced Loading States**: Added comprehensive loading indicators during press release generation with visual feedback
- **5-Step Wizard**: Expanded wizard to include file upload as first step, maintaining existing functionality
- **Improved User Experience**: Added file upload area with drag-and-drop styling and file management
- **File Processing Backend**: New `/api/generate-from-file` endpoint handles document processing and AI content generation
- **Loading Optimization**: Generate button shows spinner and prevents multiple submissions during processing
- **27+ Languages**: Complete translation support including 12 Indian regional languages (Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Urdu, Kannada, Odia, Malayalam, Punjabi, Assamese)
- **Translation Bug Fix**: Fixed duplicate key constraint error by properly excluding id and createdAt fields
- **UI Cleanup**: Removed unwanted h1 element from navigation header and improved button responsiveness

**Rollback Point**: This version includes stable file upload functionality with comprehensive translation support and enhanced loading states.

The application is designed for scalability with clear separation of concerns, type safety throughout the stack, and modern development practices including hot reloading and error handling.