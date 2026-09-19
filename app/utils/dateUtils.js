export function formatRelativeTime(date, short = false) {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now - target;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) {
    return short ? "0s" : "à l'instant";
  }

  const units = [
    { limit: 60, divisor: 1, shortLabel: "s", longLabel: "sec" },
    { limit: 3600, divisor: 60, shortLabel: "min", longLabel: "min" },
    { limit: 86400, divisor: 3600, shortLabel: "h", longLabel: "heure" },
    { limit: 604800, divisor: 86400, shortLabel: "j", longLabel: "jour" },
    {
      limit: 2629800,
      divisor: 604800,
      shortLabel: "sem",
      longLabel: "semaine",
    },
    {
      limit: 31557600,
      divisor: 2629800,
      shortLabel: "mois",
      longLabel: "mois",
    },
    { limit: Infinity, divisor: 31557600, shortLabel: "an", longLabel: "an" },
  ];

  for (const unit of units) {
    if (diffSec < unit.limit) {
      const value = Math.floor(diffSec / unit.divisor);

      if (short) {
        return `${value}${unit.shortLabel}`;
      }

      const label =
        value > 1 && !["mois"].includes(unit.longLabel)
          ? `${unit.longLabel}s`
          : unit.longLabel;

      return `il y a ${value} ${label}`;
    }
  }
}

export function formatRelativeTimeFuture(date, short = false) {
  const now = new Date();
  const target = new Date(date);
  const diffSec = Math.floor((target - now) / 1000);

  if (diffSec < 0) return formatRelativeTime(date, short);
  if (diffSec < 5) return short ? "0s" : "maintenant";

  const units = [
    { limit: 60, divisor: 1, shortLabel: "s", longLabel: "sec" },
    { limit: 3600, divisor: 60, shortLabel: "min", longLabel: "min" },
    { limit: 86400, divisor: 3600, shortLabel: "h", longLabel: "h" },
    { limit: 604800, divisor: 86400, shortLabel: "j", longLabel: "jour" },
    {
      limit: 2629800,
      divisor: 604800,
      shortLabel: "sem",
      longLabel: "semaine",
    },
    {
      limit: 31557600,
      divisor: 2629800,
      shortLabel: "mois",
      longLabel: "mois",
    },
    { limit: Infinity, divisor: 31557600, shortLabel: "an", longLabel: "an" },
  ];

  for (const unit of units) {
    if (diffSec < unit.limit) {
      const value = Math.floor(diffSec / unit.divisor);
      if (short) return `${value}${unit.shortLabel}`;

      const label =
        value > 1 && unit.longLabel !== "mois"
          ? `${unit.longLabel}s`
          : unit.longLabel;
      return `dans ${value} ${label}`;
    }
  }
}

function isSameDay(a, b) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

/**
 * Aujourd'hui → "14:32"
 * Hier → "Hier"
 * Cette semaine → "Lundi"
 * Plus ancien → "12/08/2026"
 */
export function formatSmartDate(date) {
  const target = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(target, now)) {
    return target.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isSameDay(target, yesterday)) {
    return "Hier";
  }

  const diffDays = Math.floor((now - target) / 86400000);
  if (diffDays < 7) {
    return target.toLocaleDateString("fr-FR", { weekday: "long" }); // "lundi"
  }

  return target.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Version avec heure toujours visible en plus :
 * "Aujourd'hui à 14:32", "Hier à 09:10", "12 août à 18:45"
 */
export function formatSmartDateWithTime(date) {
  const target = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = target.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isSameDay(target, now)) return `Aujourd'hui à ${time}`;
  if (isSameDay(target, yesterday)) return `Hier à ${time}`;

  const dayMonth = target.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

  const sameYear = target.getFullYear() === now.getFullYear();
  return sameYear
    ? `${dayMonth} à ${time}`
    : `${dayMonth} ${target.getFullYear()} à ${time}`;
}

/**
 * Séparateur de section dans une liste de messages :
 * "Aujourd'hui", "Hier", "12 août", "3 mars 2025"
 */
export function formatDateSeparator(date) {
  const target = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(target, now)) return "Aujourd'hui";
  if (isSameDay(target, yesterday)) return "Hier";

  const sameYear = target.getFullYear() === now.getFullYear();
  return target.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: sameYear ? undefined : "numeric",
  });
}

/** 12/08/2026 */
export function formatDateShort(date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** 12 août 2026 */
export function formatDateLong(date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** mardi 12 août 2026 */
export function formatDateFull(date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** 14:32 */
export function formatTimeOnly(date) {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 14:32:07 */
export function formatTimeWithSeconds(date) {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** 12/08/2026 14:32 */
export function formatDateTimeShort(date) {
  return `${formatDateShort(date)} ${formatTimeOnly(date)}`;
}

/** 12 août 2026 à 14:32 */
export function formatDateTimeLong(date) {
  return `${formatDateLong(date)} à ${formatTimeOnly(date)}`;
}

/**
 * Convertit une durée en secondes en "1h 23min", "45min", "12s"
 */
export function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  if (h > 0) return `${h}h ${m > 0 ? `${m}min` : ""}`.trim();
  if (m > 0) return `${m}min ${s > 0 ? `${s}s` : ""}`.trim();
  return `${s}s`;
}

/**
 * Format chronomètre "01:23:45" ou "23:45"
 */
export function formatDurationClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  const pad = (n) => String(n).padStart(2, "0");

  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Compte à rebours : "expire dans 3j 4h", "expiré depuis 2j"
 */
export function formatCountdown(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target - now;

  if (diffMs < 0) {
    return `expiré ${formatRelativeTime(targetDate)}`;
  }

  const diffSec = Math.floor(diffMs / 1000);
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  if (days > 0) return `expire dans ${days}j ${hours}h`;
  if (hours > 0) return `expire dans ${hours}h ${minutes}min`;
  return `expire dans ${minutes}min`;
}

/**
 * ISO vers timestamp Unix (secondes) — utile pour tri/comparaisons
 */
export function toUnixTimestamp(date) {
  return Math.floor(new Date(date).getTime() / 1000);
}

/**
 * Vérifie si une date tombe aujourd'hui
 */
export function isToday(date) {
  return isSameDay(new Date(date), new Date());
}

/**
 * Vérifie si une date tombe hier
 */
export function isYesterday(date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(new Date(date), yesterday);
}
