#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { realEmployees, realCompetences, vehicles } from './real-caddy-data.js';
import 'dotenv/config';

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

// Client Supabase avec pouvoirs admin
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Créer le serveur MCP
const server = new Server(
  {
    name: 'caddy-supabase-server',
    version: '1.0.0',
    description: 'Serveur MCP pour la gestion Supabase de l\'application Caddy'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Outil MCP : Créer les tables de base
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'create_caddy_database':
      return await createCaddyDatabase();
    
    case 'insert_caddy_data':
      return await insertCaddyData();
    
    case 'get_database_status':
      return await getDatabaseStatus();
    
    case 'create_user_account':
      return await createUserAccount(args.email, args.password);
    
    case 'reset_database':
      return await resetDatabase();
    
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
});

// Lister les outils disponibles
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'create_caddy_database',
        description: 'Créer toutes les tables de base pour l\'application Caddy',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'insert_caddy_data',
        description: 'Insérer toutes les données initiales (véhicules, employés, compétences)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_database_status',
        description: 'Vérifier l\'état actuel de la base de données',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'create_user_account',
        description: 'Créer un compte utilisateur Supabase',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email de l\'utilisateur' },
            password: { type: 'string', description: 'Mot de passe' }
          },
          required: ['email', 'password']
        }
      },
      {
        name: 'reset_database',
        description: 'Réinitialiser complètement la base de données',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]
  };
});

// === FONCTIONS D'IMPLÉMENTATION ===

async function createCaddyDatabase() {
  try {
    // Créer les tables une par une
    const tables = [
      // Table véhicules
      `CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(50) NOT NULL,
        capacite INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        couleur VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      // Table employés
      `CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100),
        email VARCHAR(255) UNIQUE,
        telephone VARCHAR(20),
        profil VARCHAR(20) NOT NULL CHECK (profil IN ('Faible', 'Moyen', 'Fort')),
        langues TEXT[] DEFAULT '{}',
        permis BOOLEAN DEFAULT FALSE,
        etoiles INTEGER DEFAULT 1 CHECK (etoiles IN (1, 2)),
        statut VARCHAR(20) DEFAULT 'Actif' CHECK (statut IN ('Actif', 'Absent', 'Formation')),
        date_embauche DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      // Table compétences
      `CREATE TABLE IF NOT EXISTS competences (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        niveau VARCHAR(20) NOT NULL CHECK (niveau IN ('X', 'XX')),
        date_validation DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(employee_id, vehicle_id)
      )`,
      
      // Table planning
      `CREATE TABLE IF NOT EXISTS planning (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        role VARCHAR(50) DEFAULT 'Équipier',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];

    // Exécuter chaque création de table
    for (const tableSQL of tables) {
      const { error } = await supabase.rpc('exec_sql', { sql: tableSQL });
      if (error) throw error;
    }

    return {
      content: [
        {
          type: 'text',
          text: '✅ Tables créées avec succès !\n- vehicles\n- employees\n- competences\n- planning'
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Erreur création tables: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function insertCaddyData() {
  try {
    // Insérer les véhicules
    const { error: vehiclesError } = await supabase
      .from('vehicles')
      .upsert(vehicles, { onConflict: 'nom' });
    
    if (vehiclesError) throw vehiclesError;

    // Insérer les employés
    const { error: employeesError } = await supabase
      .from('employees')
      .upsert(realEmployees, { onConflict: 'email' });
    
    if (employeesError) throw employeesError;

    // Récupérer les IDs des employés et véhicules pour les compétences
    const { data: employeesData } = await supabase.from('employees').select('id, nom');
    const { data: vehiclesData } = await supabase.from('vehicles').select('id, nom');
    
    const empMap = employeesData.reduce((acc, emp) => ({ ...acc, [emp.nom]: emp.id }), {});
    const vehMap = vehiclesData.reduce((acc, veh) => ({ ...acc, [veh.nom]: veh.id }), {});

    // Créer les compétences selon le tableau réel
    const competences = [];
    Object.entries(realCompetences).forEach(([vehicleName, levels]) => {
      const vehicleId = vehMap[vehicleName];
      if (vehicleId) {
        Object.entries(levels).forEach(([niveau, employes]) => {
          employes.forEach(nom => {
            const employeeId = empMap[nom];
            if (employeeId) {
              competences.push({
                employee_id: employeeId,
                vehicle_id: vehicleId,
                niveau,
                date_validation: new Date().toISOString().split('T')[0]
              });
            }
          });
        });
      }
    });

    const { error: competencesError } = await supabase
      .from('competences')
      .upsert(competences, { onConflict: ['employee_id', 'vehicle_id'] });
    
    if (competencesError) throw competencesError;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Données insérées avec succès !
- 5 véhicules (Crafter 21/23, Jumper, Ducato, Transit)
- 21 employés réels selon votre tableau
- ${competences.length} compétences configurées (X/XX)`
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Erreur insertion données: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function getDatabaseStatus() {
  try {
    const tables = ['vehicles', 'employees', 'competences', 'planning'];
    const status = {};

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      status[table] = error ? 'ERROR' : `${count} rows`;
    }

    return {
      content: [
        {
          type: 'text',
          text: `📊 État de la base de données:\n${Object.entries(status)
            .map(([table, info]) => `- ${table}: ${info}`)
            .join('\n')}`
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Erreur vérification: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function createUserAccount(email, password) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: email.split('@')[0],
        role: 'admin'
      }
    });

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Compte utilisateur créé !\nEmail: ${email}\nID: ${data.user.id}`
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Erreur création compte: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function resetDatabase() {
  try {
    // Supprimer toutes les données (gardant les tables)
    const tables = ['planning', 'competences', 'employees', 'vehicles'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', 0); // Delete all
      
      if (error) throw error;
    }

    return {
      content: [
        {
          type: 'text',
          text: '✅ Base de données réinitialisée !\nToutes les données ont été supprimées.'
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Erreur réinitialisation: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

// Démarrer le serveur
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Serveur MCP Caddy démarré');
}

main().catch(console.error); 