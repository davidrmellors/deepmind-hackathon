
# Implementation Plan: AI-Powered Safety Route Advisor for Cape Town

**Branch**: `001-ai-powered-safety` | **Date**: September 24, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-powered-safety/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
SafeRoute AI is an intelligent navigation assistant that helps Cape Town residents and visitors choose the safest routes to their destinations. The system combines Google's routing capabilities with local crime data and AI-powered safety insights to provide route recommendations that prioritize personal safety without compromising convenience. Target users include Cape Town residents, tourists, and ride-sharing drivers.

## Technical Context
**Language/Version**: JavaScript/TypeScript (Node.js 18+, React 18+) for rapid hackathon development
**Primary Dependencies**: Google Maps Platform APIs, crime data APIs, React for frontend, Express.js for backend
**Storage**: Local JSON files for crime data, browser storage for user preferences
**Testing**: Jest for unit tests, React Testing Library for component tests
**Target Platform**: Web browsers (Chrome, Safari, Firefox) with responsive mobile design
**Project Type**: Web application (frontend + backend)
**Performance Goals**: <2 second route calculation, real-time safety score updates
**Constraints**: 6-hour hackathon timeline, Google AI technology integration required, Cape Town geographic scope
**Scale/Scope**: Hackathon prototype supporting Cape Town metropolitan area, 3-5 key user scenarios

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Review**: ✅ PASS
- Web application architecture aligns with standard patterns
- No constitutional violations detected - constitution file is template-only
- Hackathon constraints favor rapid development over long-term architectural concerns
- Technology choices (React, Node.js, Google APIs) are appropriate for scope and timeline

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - Frontend + Backend structure for web-based navigation interface

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each OpenAPI contract → contract test tasks [P] for routes-api.yaml and safety-api.yaml
- Each data model entity → TypeScript interface + validation tasks [P]
- Each user scenario from quickstart → integration test task
- Implementation tasks structured for hackathon timeline

**Specific Task Categories**:
1. **Foundation Tasks** (Hours 0-1):
   - Project structure setup (frontend/backend directories)
   - Environment configuration and Google API setup
   - TypeScript interfaces from data model
   - Basic Express.js server with health endpoint

2. **Core API Tasks** (Hours 1-3):
   - Routes API endpoints (/calculate, /{routeId}, /{routeId}/safety)
   - Safety API endpoints (/score, /area/{gridId}, /alerts, /crime-data)
   - Safety scoring algorithm implementation
   - Synthetic Cape Town crime data generation

3. **Frontend Tasks** (Hours 3-5):
   - React components (MapView, RouteSelector, SafetyIndicator)
   - Google Maps integration
   - Route calculation UI flow
   - Mobile responsive design

4. **Integration Tasks** (Hours 5-6):
   - Google AI (Gemini) integration for safety explanations
   - End-to-end testing of user scenarios
   - Performance optimization
   - Demo preparation

**Ordering Strategy**:
- TDD order: Contract tests before implementation
- Dependency order: Data models → Services → API endpoints → UI components
- Parallel opportunities: Frontend + Backend development after contracts
- Mark [P] for parallel execution (independent teams can work simultaneously)

**Timeline Optimization**:
- Tasks 1-8: Foundation and setup (can be done in parallel by different team members)
- Tasks 9-16: API implementation (backend focus)
- Tasks 17-24: Frontend implementation (frontend focus, parallel with backend)
- Tasks 25-30: Integration and demo prep (full team collaboration)

**Estimated Output**: 28-32 numbered, ordered tasks in tasks.md optimized for 3-person team and 6-hour hackathon constraints

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ research.md generated
- [x] Phase 1: Design complete (/plan command) - ✅ data-model.md, contracts/, quickstart.md, CLAUDE.md generated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ Strategy documented
- [ ] Phase 3: Tasks generated (/tasks command) - Pending
- [ ] Phase 4: Implementation complete - Pending
- [ ] Phase 5: Validation passed - Pending

**Gate Status**:
- [x] Initial Constitution Check: PASS - ✅ No violations detected
- [x] Post-Design Constitution Check: PASS - ✅ Architecture aligns with web app patterns
- [x] All NEEDS CLARIFICATION resolved - ✅ Technical context finalized in research phase
- [x] Complexity deviations documented - ✅ No deviations needed

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
