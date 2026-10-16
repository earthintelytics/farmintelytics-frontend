/**
 * What the (i) at the top of each decision window explains: what the window is for and what
 * each choice in it does, in plain words. One place, so the wording stays consistent.
 */
export const MODAL_HELP = {
  newSignIn: {
    intro: 'Creates a sign-in for one person at a client organisation.',
    items: [
      ['Organisation', 'The client this person belongs to. They only ever see this organisation\'s data.'],
      ['Email and name', 'Who the sign-in is for. The email is what they type to sign in.'],
      ['Role', 'Admin can manage the organisation\'s people and settings; viewer can only look.'],
      ['Access code', 'Shown once after saving. Send it to the person safely; you can issue a new one later.'],
    ],
  },
  addEstate: {
    intro: 'Adds one farm or site to the organisation. Monitoring starts once its boundary is in.',
    items: [
      ['Estate name', 'The name the client uses for this site; it appears in their estate filter.'],
      ['Part of', 'Choose a parent when this estate sits inside a larger one.'],
      ['Boundary (GeoJSON)', 'The outline of the estate and its blocks. It is checked before it is saved.'],
      ['Imagery and indices', 'Which satellite readings are processed for this estate.'],
      ['Monitoring start date', 'The first date the satellite history is read from.'],
    ],
  },
  boundaryServices: {
    intro: 'A boundary can be used by some services and not others.',
    items: [
      ['Services', 'Only the ticked services show this estate and its blocks. With none ticked, every service uses it.'],
      ['Estate filter', 'A service shows the estate filter when two or more of its own estates are set here.'],
    ],
  },
  pipelineSettings: {
    intro: 'The settings file the pipeline reads for this estate. Change it only if you know what each value does.',
    items: [
      ['Save', 'Used from the next monitoring run; finished runs are not changed.'],
      ['Delete', 'Removes the file; the pipeline then uses the organisation\'s defaults.'],
    ],
  },
  editOrganisation: {
    intro: 'The organisation\'s name, logo and what it is licensed for.',
    items: [
      ['Name and logo', 'Shown on the organisation\'s sign-in page and in its portal.'],
      ['Crops and services', 'What the organisation can open. Anything not licensed is hidden from its people.'],
    ],
  },
  deleteOrganisationData: {
    intro: 'Deletes data for this organisation. This cannot be undone.',
    items: [
      ['Export first', 'Download the organisation\'s data as a ZIP before deleting if you may need it again.'],
      ['What is kept', 'The organisation record stays unless you delete it too.'],
    ],
  },
  pipelineRun: {
    intro: 'One monitoring or analysis job for an organisation.',
    items: [
      ['Waiting / Running / Done / Failed', 'Where the job is. A failed job shows what went wrong.'],
      ['Run again', 'Queues the same job again with the same settings. Only one job per organisation and service runs at a time.'],
    ],
  },
  addTeamMember: {
    intro: 'Adds someone to the FarmIntelytics team (not a client).',
    items: [
      ['Role', 'Owner can change everything; operations runs the platform; support can only look.'],
      ['Sign-in code', 'Shown once after adding. You can issue a new code at any time.'],
      ['Can sign in', 'Switch off to stop the person signing in without deleting them.'],
    ],
  },
  problemReport: {
    intro: 'A problem a client reported from the portal.',
    items: [
      ['What happened', 'The client\'s own words.'],
      ['Error shown', 'The message the client saw, to help find the cause.'],
      ['Mark handled', 'Moves the report out of the open list.'],
    ],
  },
  formLink: {
    intro: 'A public link to a form. Anyone with the link can answer on a phone, without an account.',
    items: [
      ['Closes on', 'After this date the link stops taking answers. Leave empty to keep it open.'],
      ['Most answers', 'The link closes after this many answers. Leave empty for no limit.'],
      ['QR code', 'Print or share it so people can open the form by scanning.'],
    ],
  },
  formAnswers: {
    intro: 'One set of answers sent through a form link.',
    items: [
      ['Approve', 'Adds or updates the member and parcel in the register from these answers.'],
      ['Ask for changes', 'Sends the answers back so the person can correct them.'],
      ['Reject', 'Keeps the answers out of the register.'],
    ],
  },
  addMember: {
    intro: 'Adds a member of the group, with their parcel if you have it.',
    items: [
      ['Form', 'The questions come from the form your organisation set up.'],
      ['Parcel boundary', 'Optional now; it can be walked or uploaded later.'],
    ],
  },
  orgAccount: {
    intro: 'A sign-in for someone in your organisation.',
    items: [
      ['Role', 'Admin can manage people and settings; viewer can only look.'],
      ['Services', 'Which services this person can open. Leave all on to give them everything you are licensed for.'],
      ['First password', 'They should change it after signing in.'],
    ],
  },
  suitabilityRun: {
    intro: 'Starts an analysis of where this crop fits, for any client. Fields marked * are required; the run is refused with a message if something is missing. The result opens when the run is finished.',
    items: [
      ['Client', 'Any organisation or person; suitability is our own engine. A registered organisation can use its estates and uploaded data; anyone else uploads the area.'],
      ['Where', 'For a registered organisation: one estate, all estates, or an uploaded area. For anyone else: an uploaded area, such as land they are considering.'],
      ['Variety or system', 'Variants set in the admin for this crop change the thresholds used.'],
      ['Irrigated', 'Rainfall limits are relaxed because water is supplied.'],
      ['Organisation\'s own data', 'Uses the client\'s soil samples, weather records or yields where uploaded, instead of regional data.'],
      ['How strict', 'Commercial estate: only the best land counts as well suited. Smallholder: marginal land can still be worth planting.'],
    ],
  },
  protectedAreaFile: {
    intro: 'Adds a protected area from a boundary file we found. New planting is never suggested inside an active protected area.',
    items: [
      ['Boundary file', 'GeoJSON, KML or a zipped shapefile. It is checked before anything is saved.'],
      ['Checks', 'Green passed, amber is a warning you can accept, red must be fixed before saving.'],
      ['One area per shape', 'For a file with several areas: each shape is saved separately, named from the column you choose.'],
      ['Published by', 'Required: who made the boundary, so every boundary can be traced to its source.'],
    ],
  },
  wdpaUpload: {
    intro: 'Loads the official world list of protected areas (WDPA) from the downloaded release.',
    items: [
      ['Archive', 'The zipped shapefile release, polygons only.'],
      ['Dataset version', 'The release name, e.g. Oct2026, shown as the source of these areas.'],
      ['Margin (km)', 'Only areas within this distance of client farms are loaded.'],
      ['Uploaded areas', 'Boundaries the team added are never overwritten.'],
    ],
  },
  runNow: {
    intro: 'Starts a monitoring run now instead of waiting for the schedule.',
    items: [
      ['Organisation and services', 'Which client and which services are processed.'],
      ['One at a time', 'If a run for the same organisation and service is already going, the new one waits for it.'],
    ],
  },
  schedule: {
    intro: 'When monitoring runs on its own for this organisation.',
    items: [
      ['How often', 'Each run reads the newest satellite images since the last one.'],
      ['Start day', 'The first day the schedule applies.'],
      ['On or off', 'Switch off to pause runs without losing the schedule.'],
    ],
  },
};
