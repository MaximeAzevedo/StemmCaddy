import React from 'react';

const ScheduleEditor = ({ 
  schedule = {}, 
  onScheduleChange, 
  colorScheme = "blue",
  jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
  className = ""
}) => {
  const colorClasses = {
    blue: {
      title: "text-blue-800",
      border: "border-blue-200",
      bg: "bg-blue-50",
      label: "text-blue-700",
      sublabel: "text-blue-600",
      input: "border-blue-300 focus:ring-blue-500 focus:border-blue-500"
    },
    emerald: {
      title: "text-emerald-800", 
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      label: "text-emerald-700",
      sublabel: "text-emerald-600",
      input: "border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500"
    }
  };

  const colors = colorClasses[colorScheme];

  const handleTimeChange = (jour, period, value) => {
    const fieldName = `${jour}_${period}`;
    const updatedSchedule = {
      ...schedule,
      [fieldName]: value
    };
    onScheduleChange(updatedSchedule);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <h3 className={`text-lg font-semibold ${colors.title} border-b ${colors.border} pb-2`}>
        Horaires de travail
      </h3>

      <div className="space-y-4">
        {jours.map(jour => (
          <div key={jour} className={`${colors.bg} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-sm font-medium ${colors.label} capitalize`}>
                {jour}
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs ${colors.sublabel} mb-1`}>Début</label>
                <input
                  type="time"
                  value={schedule[`${jour}_debut`] || '08:00'}
                  onChange={(e) => handleTimeChange(jour, 'debut', e.target.value)}
                  className={`w-full px-3 py-2 border ${colors.input} rounded-lg focus:ring-2 text-sm`}
                />
              </div>
              <div>
                <label className={`block text-xs ${colors.sublabel} mb-1`}>Fin</label>
                <input
                  type="time"
                  value={schedule[`${jour}_fin`] || '16:00'}
                  onChange={(e) => handleTimeChange(jour, 'fin', e.target.value)}
                  className={`w-full px-3 py-2 border ${colors.input} rounded-lg focus:ring-2 text-sm`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleEditor; 