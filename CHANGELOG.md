# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.7] - 2026-08-30

### Changed
- Toolbar icon and add-on logo replaced with the pirate flag emoji (🏴☠️).

## [3.6] - 2026-08-08

### Added
- New icon to replace the default one that was assigned.
- Persistent theme, text-size, and layout settings saved via `browser.storage`.
- Four text-size levels: small, medium, large, and extra-large.
- System light/dark theme detection with manual overrides.
- Responsive mobile toolbar layout.
- Loading state and duplicate-request prevention.
- Specific messages for timeouts, unsupported pages, connection failures, and rate limits.
- Responsive styling for code blocks, tables, lists, blockquotes, and images.
- Confirmation prompts for private URLs, credentials, and URLs with likely token-bearing query parameters.
- Separate stylesheet (`reader.css`).
- Visible local build identifier in the reader.
- Automated tests (`test/reader-utils.test.js`).
- New supporting modules: `content.js`, `reader-utils.js`, `package.json`.

## [3.5] - 2026-05-27

Initial public release with the reader toolbar and PressReleased integration.
