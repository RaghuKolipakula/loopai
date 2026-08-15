CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    opportunityType TEXT NOT NULL,
    niche TEXT,
    realityInputs TEXT NOT NULL,
    panelOutput TEXT NOT NULL,
    score INTEGER NOT NULL,
    risks TEXT NOT NULL,
    nextStep TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
