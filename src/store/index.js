import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { api } from '../services/api';

/**
 * ========================================
 * STORE ZUSTAND - CADDY
 * ========================================
 * 
 * Centralise TOUT l'état de l'application
 * Remplace les useState dispersés dans chaque composant
 */

const useCaddyStore = create(
  devtools(
    (set, get) => ({
      // ==================== ÉTAT INITIAL ====================
      
      // Données métier
      employees: {
        cuisine: [],
        logistique: []
      },
      planning: {
        cuisine: {}, // Structure: { posteName: { creneauName: [employees] } }
        logistique: []
      },
      absences: {
        cuisine: [],
        logistique: []
      },
      vehicles: [],
      competences: [],
      denrees: [],
      
      // États de chargement
      loading: {
        employees: false,
        planning: false,
        absences: false,
        vehicles: false,
        competences: false,
        denrees: false
      },
      
      // Sélections actives (UI state)
      selectedDate: new Date(),
      selectedSession: 'matin',
      selectedService: 'cuisine',
      
      // Utilisateur
      user: null,
      
      // Métadonnées
      lastUpdate: null,
      hasUnsavedChanges: false,
      
      // ==================== ACTIONS EMPLOYÉS ====================
      
      /**
       * Charger les employés d'un service
       */
      loadEmployees: async (service) => {
        set((state) => ({
          loading: { ...state.loading, employees: true }
        }));
        
        try {
          let response;
          
          if (service === 'cuisine') {
            response = await api.employees.getCuisine();
            if (!response.error) {
              set((state) => ({
                employees: {
                  ...state.employees,
                  cuisine: response.data
                },
                lastUpdate: new Date()
              }));
            }
          } else if (service === 'logistique') {
            response = await api.employees.getLogistique();
            if (!response.error) {
              set((state) => ({
                employees: {
                  ...state.employees,
                  logistique: response.data
                },
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Employés ${service} chargés:`, response.data?.length || 0);
          
        } catch (error) {
          console.error(`❌ Erreur chargement employés ${service}:`, error);
        } finally {
          set((state) => ({
            loading: { ...state.loading, employees: false }
          }));
        }
      },
      
      /**
       * Mettre à jour un employé
       */
      updateEmployee: async (service, id, updates) => {
        try {
          let response;
          
          if (service === 'cuisine') {
            response = await api.employees.updateCuisine(id, updates);
            if (!response.error) {
              set((state) => ({
                employees: {
                  ...state.employees,
                  cuisine: state.employees.cuisine.map(emp => 
                    emp.id === id ? { ...emp, ...updates } : emp
                  )
                },
                lastUpdate: new Date()
              }));
            }
          } else if (service === 'logistique') {
            response = await api.employees.updateLogistique(id, updates);
            if (!response.error) {
              set((state) => ({
                employees: {
                  ...state.employees,
                  logistique: state.employees.logistique.map(emp => 
                    emp.id === id ? { ...emp, ...updates } : emp
                  )
                },
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Employé ${service} mis à jour:`, id);
          return response;
          
        } catch (error) {
          console.error(`❌ Erreur mise à jour employé ${service}:`, error);
          return { data: null, error };
        }
      },
      
      /**
       * Créer un nouvel employé
       */
      createEmployee: async (service, employeeData) => {
        try {
          let response;
          
          if (service === 'cuisine') {
            response = await api.employees.createCuisine(employeeData);
            if (!response.error && response.data) {
              set((state) => ({
                employees: {
                  ...state.employees,
                  cuisine: [...state.employees.cuisine, response.data[0]]
                },
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Employé ${service} créé:`, response.data);
          return response;
          
        } catch (error) {
          console.error(`❌ Erreur création employé ${service}:`, error);
          return { data: null, error };
        }
      },
      
      /**
       * Supprimer un employé (soft delete)
       */
      deleteEmployee: async (service, id) => {
        try {
          let response;
          
          if (service === 'cuisine') {
            response = await api.employees.deleteCuisine(id);
            if (!response.error) {
              set((state) => ({
                employees: {
                  ...state.employees,
                  cuisine: state.employees.cuisine.filter(emp => emp.id !== id)
                },
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Employé ${service} supprimé:`, id);
          return response;
          
        } catch (error) {
          console.error(`❌ Erreur suppression employé ${service}:`, error);
          return { data: null, error };
        }
      },
      
      // ==================== ACTIONS PLANNING ====================
      
      /**
       * Charger le planning d'un service
       */
      loadPlanning: async (service, date, session = 'matin') => {
        set((state) => ({
          loading: { ...state.loading, planning: true }
        }));
        
        try {
          const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
          
          if (service === 'cuisine') {
            const response = await api.planning.getCuisinePlanning(dateStr, session);
            if (!response.error) {
              // Convertir les données de planning en structure board
              const board = get()._convertPlanningToBoard(response.data);
              
              set((state) => ({
                planning: {
                  ...state.planning,
                  cuisine: board
                },
                lastUpdate: new Date()
              }));
            }
          } else if (service === 'logistique') {
            // Pour logistique, on charge une semaine
            const endDate = new Date(dateStr);
            endDate.setDate(endDate.getDate() + 6);
            
            const response = await api.planning.getLogistiquePlanning(
              dateStr, 
              endDate.toISOString().split('T')[0]
            );
            if (!response.error) {
              set((state) => ({
                planning: {
                  ...state.planning,
                  logistique: response.data
                },
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Planning ${service} chargé pour ${dateStr}`);
          
        } catch (error) {
          console.error(`❌ Erreur chargement planning ${service}:`, error);
        } finally {
          set((state) => ({
            loading: { ...state.loading, planning: false }
          }));
        }
      },
      
      /**
       * Sauvegarder le planning
       */
      savePlanning: async (service, planningData) => {
        try {
          let response;
          
          if (service === 'cuisine') {
            // Convertir la structure board en données de planning
            const planningEntries = get()._convertBoardToPlanning(planningData);
            response = await api.planning.saveCuisinePlanning(planningEntries);
            
            if (!response.error) {
              set((state) => ({
                planning: {
                  ...state.planning,
                  cuisine: planningData
                },
                hasUnsavedChanges: false,
                lastUpdate: new Date()
              }));
            }
          } else if (service === 'logistique') {
            response = await api.planning.saveLogistiquePlanning(planningData);
            
            if (!response.error) {
              set((state) => ({
                planning: {
                  ...state.planning,
                  logistique: planningData
                },
                hasUnsavedChanges: false,
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Planning ${service} sauvegardé`);
          return response;
          
        } catch (error) {
          console.error(`❌ Erreur sauvegarde planning ${service}:`, error);
          return { data: null, error };
        }
      },
      
      /**
       * Mettre à jour le planning local (pour drag & drop)
       */
      updatePlanningLocal: (service, planningData) => {
        if (service === 'cuisine') {
          set((state) => ({
            planning: {
              ...state.planning,
              cuisine: planningData
            },
            hasUnsavedChanges: true
          }));
        } else if (service === 'logistique') {
          set((state) => ({
            planning: {
              ...state.planning,
              logistique: planningData
            },
            hasUnsavedChanges: true
          }));
        }
      },
      
      // ==================== ACTIONS ABSENCES ====================
      
      /**
       * Charger les absences
       */
      loadAbsences: async (service, startDate, endDate) => {
        set((state) => ({
          loading: { ...state.loading, absences: true }
        }));
        
        try {
          let response;
          
          if (service === 'cuisine') {
            response = await api.absences.getCuisineAbsences(startDate, endDate);
            if (!response.error) {
              set((state) => ({
                absences: {
                  ...state.absences,
                  cuisine: response.data
                },
                lastUpdate: new Date()
              }));
            }
          } else if (service === 'logistique') {
            response = await api.absences.getLogistiqueAbsences(startDate, endDate);
            if (!response.error) {
              set((state) => ({
                absences: {
                  ...state.absences,
                  logistique: response.data
                },
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Absences ${service} chargées:`, response.data?.length || 0);
          
        } catch (error) {
          console.error(`❌ Erreur chargement absences ${service}:`, error);
        } finally {
          set((state) => ({
            loading: { ...state.loading, absences: false }
          }));
        }
      },
      
      /**
       * Créer une absence
       */
      createAbsence: async (service, absenceData) => {
        try {
          let response;
          
          if (service === 'cuisine') {
            response = await api.absences.createCuisineAbsence(absenceData);
            if (!response.error && response.data) {
              set((state) => ({
                absences: {
                  ...state.absences,
                  cuisine: [response.data[0], ...state.absences.cuisine]
                },
                lastUpdate: new Date()
              }));
            }
          } else if (service === 'logistique') {
            response = await api.absences.createLogistiqueAbsence(absenceData);
            if (!response.error && response.data) {
              set((state) => ({
                absences: {
                  ...state.absences,
                  logistique: [response.data[0], ...state.absences.logistique]
                },
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Absence ${service} créée:`, response.data);
          return response;
          
        } catch (error) {
          console.error(`❌ Erreur création absence ${service}:`, error);
          return { data: null, error };
        }
      },
      
      /**
       * Mettre à jour une absence
       */
      updateAbsence: async (service, id, updates) => {
        try {
          let response;
          
          if (service === 'cuisine') {
            response = await api.absences.updateCuisineAbsence(id, updates);
            if (!response.error) {
              set((state) => ({
                absences: {
                  ...state.absences,
                  cuisine: state.absences.cuisine.map(abs => 
                    abs.id === id ? { ...abs, ...updates } : abs
                  )
                },
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Absence ${service} mise à jour:`, id);
          return response;
          
        } catch (error) {
          console.error(`❌ Erreur mise à jour absence ${service}:`, error);
          return { data: null, error };
        }
      },
      
      /**
       * Supprimer une absence
       */
      deleteAbsence: async (service, id) => {
        try {
          let response;
          
          if (service === 'cuisine') {
            response = await api.absences.deleteCuisineAbsence(id);
            if (!response.error) {
              set((state) => ({
                absences: {
                  ...state.absences,
                  cuisine: state.absences.cuisine.filter(abs => abs.id !== id)
                },
                lastUpdate: new Date()
              }));
            }
          }
          
          console.log(`✅ Absence ${service} supprimée:`, id);
          return response;
          
        } catch (error) {
          console.error(`❌ Erreur suppression absence ${service}:`, error);
          return { data: null, error };
        }
      },
      
      // ==================== ACTIONS LOGISTIQUE ====================
      
      /**
       * Charger les véhicules
       */
      loadVehicles: async () => {
        set((state) => ({
          loading: { ...state.loading, vehicles: true }
        }));
        
        try {
          const response = await api.logistics.getVehicles();
          if (!response.error) {
            set({
              vehicles: response.data,
              lastUpdate: new Date()
            });
          }
          
          console.log('✅ Véhicules chargés:', response.data?.length || 0);
          
        } catch (error) {
          console.error('❌ Erreur chargement véhicules:', error);
        } finally {
          set((state) => ({
            loading: { ...state.loading, vehicles: false }
          }));
        }
      },
      
      /**
       * Charger les compétences
       */
      loadCompetences: async () => {
        set((state) => ({
          loading: { ...state.loading, competences: true }
        }));
        
        try {
          const response = await api.logistics.getCompetences();
          if (!response.error) {
            set({
              competences: response.data,
              lastUpdate: new Date()
            });
          }
          
          console.log('✅ Compétences chargées:', response.data?.length || 0);
          
        } catch (error) {
          console.error('❌ Erreur chargement compétences:', error);
        } finally {
          set((state) => ({
            loading: { ...state.loading, competences: false }
          }));
        }
      },
      
      /**
       * Mettre à jour une compétence
       */
      updateCompetence: async (employeeId, vehicleId, competenceData) => {
        try {
          const response = await api.logistics.updateCompetence(employeeId, vehicleId, competenceData);
          if (!response.error) {
            // Recharger les compétences pour simplifier
            await get().loadCompetences();
          }
          
          console.log('✅ Compétence mise à jour:', employeeId, vehicleId);
          return response;
          
        } catch (error) {
          console.error('❌ Erreur mise à jour compétence:', error);
          return { data: null, error };
        }
      },
      
      // ==================== ACTIONS SECRÉTARIAT ====================
      
      /**
       * Charger les denrées alimentaires
       */
      loadDenrees: async (annee = 2025) => {
        set((state) => ({
          loading: { ...state.loading, denrees: true }
        }));
        
        try {
          const response = await api.secretariat.getDenreesAlimentaires(annee);
          if (!response.error) {
            set({
              denrees: response.data,
              lastUpdate: new Date()
            });
          }
          
          console.log('✅ Denrées alimentaires chargées:', response.data?.length || 0);
          
        } catch (error) {
          console.error('❌ Erreur chargement denrées:', error);
        } finally {
          set((state) => ({
            loading: { ...state.loading, denrees: false }
          }));
        }
      },
      
      /**
       * Créer une denrée alimentaire
       */
      createDenree: async (denreeData) => {
        try {
          const response = await api.secretariat.createDenreeAlimentaire(denreeData);
          if (!response.error && response.data) {
            set((state) => ({
              denrees: [response.data[0], ...state.denrees],
              lastUpdate: new Date()
            }));
          }
          
          console.log('✅ Denrée alimentaire créée:', response.data);
          return response;
          
        } catch (error) {
          console.error('❌ Erreur création denrée:', error);
          return { data: null, error };
        }
      },
      
      // ==================== ACTIONS UI ====================
      
      /**
       * Changer la date sélectionnée
       */
      setSelectedDate: (date) => {
        set({ selectedDate: date });
      },
      
      /**
       * Changer la session sélectionnée
       */
      setSelectedSession: (session) => {
        set({ selectedSession: session });
      },
      
      /**
       * Changer le service sélectionné
       */
      setSelectedService: (service) => {
        set({ selectedService: service });
      },
      
      /**
       * Marquer comme non sauvegardé
       */
      markAsUnsaved: () => {
        set({ hasUnsavedChanges: true });
      },
      
      /**
       * Marquer comme sauvegardé
       */
      markAsSaved: () => {
        set({ hasUnsavedChanges: false });
      },
      
      // ==================== ACTIONS AUTHENTIFICATION ====================
      
      /**
       * Connexion
       */
      signIn: async (email, password) => {
        try {
          const response = await api.auth.signIn(email, password);
          if (!response.error && response.data?.user) {
            set({ user: response.data.user });
            console.log('✅ Connexion réussie:', response.data.user.email);
            return true;
          }
          
          console.error('❌ Erreur connexion:', response.error);
          return false;
          
        } catch (error) {
          console.error('❌ Erreur critique connexion:', error);
          return false;
        }
      },
      
      /**
       * Déconnexion
       */
      signOut: async () => {
        try {
          await api.auth.signOut();
          set({ 
            user: null,
            // Réinitialiser l'état
            employees: { cuisine: [], logistique: [] },
            planning: { cuisine: {}, logistique: [] },
            absences: { cuisine: [], logistique: [] },
            vehicles: [],
            competences: [],
            denrees: [],
            hasUnsavedChanges: false
          });
          
          console.log('✅ Déconnexion réussie');
          
        } catch (error) {
          console.error('❌ Erreur déconnexion:', error);
        }
      },
      
      // ==================== ACTIONS UTILITAIRES ====================
      
      /**
       * Réinitialiser complètement l'état
       */
      resetState: () => {
        set({
          employees: { cuisine: [], logistique: [] },
          planning: { cuisine: {}, logistique: [] },
          absences: { cuisine: [], logistique: [] },
          vehicles: [],
          competences: [],
          denrees: [],
          loading: {
            employees: false,
            planning: false,
            absences: false,
            vehicles: false,
            competences: false,
            denrees: false
          },
          selectedDate: new Date(),
          selectedSession: 'matin',
          selectedService: 'cuisine',
          user: null,
          lastUpdate: null,
          hasUnsavedChanges: false
        });
      },
      
      /**
       * Vérifier la santé de l'API
       */
      healthCheck: async () => {
        try {
          const result = await api.healthCheck();
          console.log('🔍 Health check API:', result.healthy ? '✅' : '❌');
          return result;
        } catch (error) {
          console.error('❌ Erreur health check:', error);
          return { healthy: false, error };
        }
      },
      
      // ==================== FONCTIONS HELPER PRIVÉES ====================
      
      /**
       * Convertir les données de planning en structure board (pour cuisine)
       */
      _convertPlanningToBoard: (planningData) => {
        const board = {};
        
        // Initialiser la structure avec les postes
        const { data: postes } = api.planning.getPostesCuisine();
        const { data: creneaux } = api.planning.getCreneauxCuisine();
        
        postes.forEach(poste => {
          board[poste.nom] = {};
          creneaux.forEach(creneau => {
            board[poste.nom][creneau.nom] = [];
          });
        });
        
        // Remplir avec les données de planning
        planningData.forEach(entry => {
          if (board[entry.poste_nom] && board[entry.poste_nom][entry.creneau_nom]) {
            // Trouver l'employé correspondant
            const employees = get().employees.cuisine;
            const employee = employees.find(emp => emp.id === entry.employee_id);
            if (employee) {
              board[entry.poste_nom][entry.creneau_nom].push(employee);
            }
          }
        });
        
        return board;
      },
      
      /**
       * Convertir la structure board en données de planning (pour cuisine)
       */
      _convertBoardToPlanning: (board) => {
        const planningEntries = [];
        const { selectedDate, selectedSession } = get();
        const dateStr = selectedDate.toISOString().split('T')[0];
        
        Object.keys(board).forEach(posteNom => {
          Object.keys(board[posteNom]).forEach(creneauNom => {
            board[posteNom][creneauNom].forEach(employee => {
              planningEntries.push({
                date: dateStr,
                session: selectedSession,
                poste_nom: posteNom,
                creneau_nom: creneauNom,
                employee_id: employee.id
              });
            });
          });
        });
        
        return planningEntries;
      }
    }),
    {
      name: 'caddy-store',
      partialize: (state) => ({
        // Sauvegarder seulement certaines parties de l'état
        selectedDate: state.selectedDate,
        selectedSession: state.selectedSession,
        selectedService: state.selectedService,
        user: state.user
      })
    }
  )
);

export default useCaddyStore; 