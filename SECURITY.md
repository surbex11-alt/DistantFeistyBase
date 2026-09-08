# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly by emailing [security@example.com](mailto:security@example.com) instead of using the public issue tracker.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

We appreciate responsible disclosure and will acknowledge your report within 48 hours.

## Security Best Practices

### Dependencies
- Keep all dependencies up-to-date
- Review dependency updates via Dependabot
- Run `pnpm audit` regularly to check for vulnerabilities

### API Security
The API server (`artifacts/api-server`) includes:
- CORS configuration for secure cross-origin requests
- Cookie parsing and secure session handling
- Proper error handling and logging

### Development
- Use TypeScript for type safety
- Enable strict TypeScript checks
- Review code through pull requests
- Use branch protection rules

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.0.x   | ✅ Development     |

## Security Updates

Security updates will be released as soon as possible after discovery and validation. Follow the repository for updates.

## Additional Resources

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

Last Updated: 2026-09-08
