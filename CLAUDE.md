# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Doodle Do is a web app for temporary doodles. It's a React + TypeScript application built with Vite that creates a fullscreen canvas for drawing. The app allows users to draw with any input device (mouse, touch, or Apple Pencil) and refreshing the page starts over.

## Development Commands

- `npm run dev` - Start development server with host binding (accessible on network) - **NEVER RUN THIS**
- `npm run build` - Build for production (runs TypeScript compiler then Vite build)
- `npm run lint` - Run ESLint on the codebase
- `npm run preview` - Preview production build with host binding - **NEVER RUN THIS**

**IMPORTANT**: Never run `npm run dev` or `npm run preview` as these commands bind to the host network and should not be executed automatically.

## Architecture

The application consists of:

- **Main Entry Point**: `src/main.tsx` - Standard React 19 + StrictMode setup
- **Core Component**: `src/App.tsx` - Contains the `PencilOnlyCanvas` component which:
  - Creates a fullscreen canvas that responds to window resize
  - Handles high-DPI displays with proper pixel ratio scaling
  - Accepts all pointer events (mouse, touch, and pen input)
  - Implements smooth drawing with line segments between pointer move events
  - Uses `touchAction: "none"` to prevent default touch behaviors

## Key Technical Details

- **Canvas Rendering**: Uses WebGL 2.0 with GLES shaders for high-performance rendering on all devices
- **Input Support**: Accepts all input types (mouse, touch, and pen)
- **Drawing Style**: Fixed 2px line width rendered as triangle strips with black color
- **Performance**: Uses refs for drawing state to avoid re-renders during drawing
- **Responsive**: Canvas automatically resizes to fill the entire window

## Build Configuration

- **Vite**: Configured with `base: "./"` for relative paths and React plugin
- **TypeScript**: Project references setup with separate configs for app and node code
- **ESLint**: Configured with React hooks and refresh plugins, TypeScript support

## No Testing Framework

This project currently has no test command or testing framework configured.