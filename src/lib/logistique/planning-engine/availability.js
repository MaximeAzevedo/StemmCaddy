/**
 * ⏰ MODULE DE DISPONIBILITÉ
 * Gestion des horaires personnalisés, absences et fermetures
 */

/**
 * Filtre les employés disponibles selon leurs horaires et absences
 */
export function getAvailableEmployees(allEmployees, absences, date) {
  const dayOfWeek = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
  
  console.log(`⏰ Vérification disponibilité pour ${dayOfWeek} ${date}`);
  
  // 1. Filtrer les employés absents
  const absentEmployeeIds = getAbsentEmployeeIds(absences, date);
  
  // 2. Filtrer selon les horaires personnalisés et statut actif
  const availableEmployees = allEmployees.filter(employee => {
    // Employé doit être actif
    if (!employee.actif) {
      console.log(`❌ ${employee.nom}: Inactif`);
      return false;
    }
    
    // Employé ne doit pas être absent
    if (absentEmployeeIds.includes(employee.id)) {
      console.log(`❌ ${employee.nom}: Absent ce jour`);
      return false;
    }
    
    // Vérifier les horaires personnalisés pour ce jour
    if (!isAvailableForDay(employee, dayOfWeek)) {
      console.log(`❌ ${employee.nom}: Pas d'horaires pour ${dayOfWeek}`);
      return false;
    }
    
    return true;
  });
  
  console.log(`✅ ${availableEmployees.length} employés disponibles:`, 
              availableEmployees.map(e => e.nom).join(', '));
  
  return availableEmployees;
}

/**
 * Récupère les IDs des employés absents pour une date donnée
 */
function getAbsentEmployeeIds(absences, date) {
  return absences
    .filter(absence => {
      // Vérifier si l'absence couvre cette date
      const isInRange = date >= absence.date_debut && date <= absence.date_fin;
      
      // Exclure les rendez-vous (pas des vraies absences)
      const isRealAbsence = absence.type_absence !== 'Rendez-vous';
      
      return isInRange && isRealAbsence && absence.employee_id !== null;
    })
    .map(absence => absence.employee_id);
}

/**
 * Vérifie si un employé est disponible pour un jour donné
 */
function isAvailableForDay(employee, dayOfWeek) {
  const debutField = `${dayOfWeek}_debut`;
  const finField = `${dayOfWeek}_fin`;
  
  // Si l'employé a des horaires définis pour ce jour
  return employee[debutField] && employee[finField];
}

/**
 * Vérifie si le service est fermé pour une date donnée
 */
export function isServiceClosed(absences, date) {
  const fermeture = absences.find(absence => {
    return absence.type_absence === 'Fermeture' &&
           absence.employee_id === null && // Fermeture globale
           date >= absence.date_debut && 
           date <= absence.date_fin;
  });
  
  if (fermeture) {
    console.log(`🚫 SERVICE FERMÉ le ${date}: ${fermeture.motif}`);
    return { 
      isClosed: true, 
      reason: fermeture.motif,
      closure: fermeture 
    };
  }
  
  return { isClosed: false };
}

/**
 * Récupère les rendez-vous pour une date donnée
 */
export function getAppointments(absences, date) {
  return absences.filter(absence => {
    return absence.type_absence === 'Rendez-vous' &&
           absence.employee_id !== null &&
           date >= absence.date_debut && 
           date <= absence.date_fin;
  });
}

/**
 * Vérifie si un employé a un rendez-vous à une date donnée
 */
export function hasAppointment(employeeId, absences, date) {
  const appointment = absences.find(absence => {
    return absence.type_absence === 'Rendez-vous' &&
           absence.employee_id === employeeId &&
           date >= absence.date_debut && 
           date <= absence.date_fin;
  });
  
  return appointment ? {
    hasAppointment: true,
    time: appointment.heure_debut,
    details: appointment
  } : { hasAppointment: false };
}

/**
 * Récupère les horaires de travail d'un employé pour un jour donné
 */
export function getWorkingHours(employee, dayOfWeek) {
  const debutField = `${dayOfWeek}_debut`;
  const finField = `${dayOfWeek}_fin`;
  
  if (!employee[debutField] || !employee[finField]) {
    return null; // Pas de travail ce jour
  }
  
  return {
    debut: employee[debutField],
    fin: employee[finField],
    isFullDay: employee[debutField] === '08:00:00' && employee[finField] === '16:00:00'
  };
}

/**
 * Valide la disponibilité pour une période donnée
 */
export function validateAvailability(employees, absences, startDate, endDate) {
  const issues = [];
  const dates = generateDateRange(startDate, endDate);
  
  for (const date of dates) {
    // Vérifier fermetures
    const closureStatus = isServiceClosed(absences, date);
    if (closureStatus.isClosed) {
      issues.push({
        type: 'closure',
        date,
        message: `Service fermé: ${closureStatus.reason}`
      });
      continue; // Pas besoin de vérifier les employés si service fermé
    }
    
    // Vérifier disponibilité des employés
    const available = getAvailableEmployees(employees, absences, date);
    if (available.length === 0) {
      issues.push({
        type: 'no_employees',
        date,
        message: 'Aucun employé disponible'
      });
    } else if (available.length < 3) {
      issues.push({
        type: 'low_availability',
        date,
        message: `Peu d'employés disponibles (${available.length})`
      });
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    summary: {
      totalDays: dates.length,
      problematicDays: issues.length
    }
  };
}

/**
 * Génère une liste de dates entre deux dates
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Récupère le nom du jour en français
 */
export function getDayName(date) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
} 