# Staging & Production Deployment Guide

This document contains deployment instructions moved from IMPLEMENTATION_PLAN.md section 8.6.

---

## TODO 8.6: Deployment

### Frontend Deployment

**Platform Options**:
- Vercel (Recommended for React/Vite)
- Netlify
- Cloudflare Pages

**Steps**:
- [ ] Deploy to chosen platform (Vercel/Netlify/Cloudflare Pages)
- [ ] Configure environment variables:
  - `VITE_API_URL` - Backend API URL
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] Set up custom domain (optional)
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Output directory: `dist`
  - Node version: 18+
- [ ] Set up automatic deployments from git branch
- [ ] Configure preview deployments for pull requests

### Backend Deployment

**Platform Options**:
- Railway (Recommended - simple PostgreSQL integration)
- Render
- Fly.io

**Steps**:
- [ ] Deploy to chosen platform (Railway/Render/Fly.io)
- [ ] Configure environment variables:
  - `DATABASE_URL` - Supabase connection string
  - `SUPABASE_URL` - Supabase project URL
  - `SUPABASE_SERVICE_KEY` - Supabase service role key
  - `JWT_SECRET` - Secret for JWT token signing
  - `NODE_ENV=production`
  - `PORT` - Server port (usually auto-assigned)
  - `CORS_ORIGIN` - Frontend URL for CORS
- [ ] Set up health checks endpoint (`/health` or `/api/health`)
- [ ] Configure start command: `npm start`
- [ ] Set up automatic deployments from git branch
- [ ] Configure CORS to allow frontend domain

### Database

**Current Setup**: Already on Supabase

**Steps**:
- [ ] Upgrade to production tier if needed (evaluate based on usage)
- [ ] Set up automated backups:
  - Supabase Pro includes daily backups
  - Configure backup retention policy
- [ ] Monitor database usage:
  - Database size
  - Connection pool usage
  - Query performance
- [ ] Review and optimize Row Level Security (RLS) policies
- [ ] Set up database alerts for:
  - High CPU usage
  - High disk usage
  - Connection pool exhaustion

### SSL/TLS

**Frontend**: Automatic via Vercel/Netlify/Cloudflare
**Backend**: Automatic via Railway/Render/Fly.io
**Database**: Supabase provides SSL by default

### Environment Variables Reference

**Frontend (.env.production)**:
```bash
VITE_API_URL=https://api.scholarshiphub.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend (.env.production)**:
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://scholarshiphub.com
```

### Deployment Workflow

1. **Development** → Push to `main` branch
2. **Automatic Build** → Platform builds and tests
3. **Automatic Deploy** → Deploy to production
4. **Health Checks** → Verify deployment success
5. **Rollback** → If issues detected, rollback to previous version

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] CORS configured correctly
- [ ] Health check endpoint working
- [ ] Error tracking configured
- [ ] Backup strategy in place
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates active

### Post-Deployment Verification

- [ ] Verify all pages load correctly
- [ ] Test authentication flow (login, register, password reset)
- [ ] Test core features:
  - Create/view/edit applications
  - Add collaborators
  - Upload essays and documents
  - Set reminders
  - Search scholarships
- [ ] Check error tracking is receiving data
- [ ] Monitor initial performance metrics
- [ ] Verify uptime monitoring is active

---

**Last Updated**: December 2025
