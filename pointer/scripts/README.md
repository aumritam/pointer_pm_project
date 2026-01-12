# Feedback Seeding Scripts

This directory contains scripts to populate your feedback database with mock data for testing.

## Methods

### 1. API Method (Recommended)
Uses the Workers AI to classify sentiment and extract themes automatically.

```bash
# Start your worker locally
npm run dev

# In another terminal, run the seeding script
node scripts/seed-feedback.js
```

### 2. Direct SQL Method
Bypasses AI classification and uses predefined sentiment/theme values.

```bash
# Execute SQL directly on your D1 database
wrangler d1 execute pointer-db --file=scripts/seed-feedback.sql
```

## Mock Data Distribution

- **Support (5 entries)**: Vague frustration and general system issues
- **GitHub (5 entries)**: Repeated complaints about specific technical issues  
- **Twitter (5 entries)**: Mixed sentiment including positive feedback
- **Community (5 entries)**: High-severity enterprise issues including:
  - SSO authentication failures
  - Data corruption in bulk operations
  - Security vulnerability in API key management
  - Multi-tenant performance degradation
  - Salesforce integration failures

## Enterprise Issues Highlighted

1. **Authentication Issues**: SSO provider integration failures
2. **Data Corruption**: Critical bulk import operations failing
3. **Security Vulnerability**: API key management system compromised
4. **Performance Degradation**: Multi-tenant environment impact
5. **Integration Failures**: Salesforce connector broken after security updates

## Notes

- The API method will trigger Workers AI classification for each entry
- The SQL method is faster but uses predefined classifications
- Both methods create the same 20 feedback entries for consistency
