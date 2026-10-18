        export function getIsAdmin() { return window.__isAdmin === true; }

        export let students = [];
        export let sections = [];
        export let currentSectionId = null;
        export let studentPrompted = false;
        export let unsubscribeStudents = null;

        export function setStudents(v) { students = v; }
        export function setSections(v) { sections = v; }
        export function setCurrentSectionId(v) { currentSectionId = v; }
        export function setStudentPrompted(v) { studentPrompted = v; }
        export function setUnsubscribeStudents(v) { unsubscribeStudents = v; }
