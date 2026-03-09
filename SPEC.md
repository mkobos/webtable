# Web Table — Specification

## Overview

A web application that allows many anonymous users to collaboratively edit a single table in real-time. The interface is simple and minimal — similar to a Google Spreadsheet, but without login and without any advanced math or programming features.

## User requirements

- **Create a table**: Any visitor can create a new table. The table is identified by a unique URL that can be shared with others.
- **Edit cells**: Any visitor with the URL can edit any cell in the table by clicking on it.
- **Real-time collaboration**: Changes made by one user are immediately visible to all other users viewing the same table.
- **Responsive**: Works well on desktop computers, tablets, and mobile phones.
- **No account required**: No login, no registration.

## Out of scope

- Formulas or calculations
- Cell formatting (bold, colors, etc.)
- User authentication
- Access control or permissions
- Edit history
