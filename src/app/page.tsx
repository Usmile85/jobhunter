'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Briefcase, Search, FileText, Bell, Settings, Upload,
  MapPin, DollarSign, Clock, ExternalLink, Bookmark,
  Loader2, Sparkles, Trash2,
  Building2, GraduationCap,
  FileBadge, Filter
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ============ Types ============
interface ParsedProfile {
  name: string | null
  email: string | null
  title: string | null
  summary: string | null
  skills: string[]
  experience: Array<{ title: string; company: string; duration: string }>
  education: Array<{ degree: string; school: string; year: string }>
}

interface Job {
  title: string
  company: string
  location: string | null
  description: string | null
  url: string | null
  source: string | null
  salary: string | null
  jobType: string | null
  postedDate: string | null
  matchScore?: number
}

interface SavedJob {
  id: string
  title: string
  company: string
  location: string | null
  description: string | null
  url: string | null
  source: string | null
  salary: string | null
  jobType: string | null
  matchScore: number | null
  postedDate: string | null
  status: string
  notes: string | null
  coverLetter: string | null
  appliedDate: string | null
  createdAt: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  jobId: string | null
  createdAt: string
}

interface Preferences {
  jobTitles: string[]
  locations: string[]
  remoteOnly: boolean
  salaryMin: number | null
  jobTypes: string[]
}

// ============ Main App ============
export default function Home() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('resume')
  const [loading, setLoading] = useState<string | null>(null)

  // Resume state
  const [resumeText, setResumeText] = useState('')
  const [profile, setProfile] = useState<ParsedProfile | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)

  // Jobs state
  const [searchQuery, setSearchQuery] = useState('data analyst data science')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchJobType, setSearchJobType] = useState('any')
  const [searchResults, setSearchResults] = useState<Job[]>([])
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())

  // Applications state
  const [applicationFilter, setApplicationFilter] = useState('all')

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  // Preferences state
  const [preferences, setPreferences] = useState<Preferences>({
    jobTitles: ['Data Analyst', 'Data Scientist', 'Business Analyst'],
    locations: [],
    remoteOnly: false,
    salaryMin: null,
    jobTypes: ['Full-time']
  })

  // Cover letter dialog
  const [coverLetterJob, setCoverLetterJob] = useState<SavedJob | null>(null)
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState('')
  const [showCoverLetter, setShowCoverLetter] = useState(false)

  // Job detail dialog
  const [selectedJob, setSelectedJob] = useState<SavedJob | null>(null)
  const [showJobDetail, setShowJobDetail] = useState(false)

  // Fetch initial data
  useEffect(() => {
    loadProfile()
    loadSavedJobs()
    loadNotifications()
    loadPreferences()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const json = await res.json()
        const data = json.profile
        if (data) {
          setProfileId(data.id)
          setResumeText(data.resumeText || '')
          if (data.extractedSkills || data.experience || data.education) {
            setProfile({
              name: data.name,
              email: data.email,
              title: data.title,
              summary: data.summary,
              skills: data.extractedSkills || [],
              experience: data.experience || [],
              education: data.education || [],
            })
          }
        }
      }
    } catch (e) {
      console.error('Failed to load profile', e)
    }
  }

  const loadSavedJobs = async () => {
    try {
      const res = await fetch('/api/jobs/saved')
      if (res.ok) {
        const json = await res.json()
        const data = json.savedJobs || []
        setSavedJobs(data)
        const ids = new Set(data.map((j: SavedJob) => `${j.title}-${j.company}`))
        setSavedJobIds(ids)
      }
    } catch (e) {
      console.error('Failed to load saved jobs', e)
    }
  }

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const json = await res.json()
        setNotifications(json.notifications || [])
      }
    } catch (e) {
      console.error('Failed to load notifications', e)
    }
  }

  const loadPreferences = async () => {
    try {
      const res = await fetch('/api/preferences')
      if (res.ok) {
        const json = await res.json()
        const data = json.preference
        if (data) {
          setPreferences({
            jobTitles: data.jobTitles || ['Data Analyst', 'Data Scientist'],
            locations: data.locations || [],
            remoteOnly: data.remoteOnly || false,
            salaryMin: data.salaryMin || null,
            jobTypes: data.jobTypes || ['Full-time'],
          })
        }
      }
    } catch (e) {
      console.error('Failed to load preferences', e)
    }
  }

  // Parse resume
  const handleParseResume = async () => {
    if (!resumeText.trim()) {
      toast({ title: 'Error', description: 'Please paste your resume text first', variant: 'destructive' })
      return
    }
    setLoading('parsing')
    try {
      // First save the profile
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      })
      // Then parse it
      const res = await fetch('/api/profile/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      })
      if (res.ok) {
        const json = await res.json()
        const data = json.parsed || json.profile
        setProfile(data)
        toast({ title: 'Resume Parsed!', description: `Found ${data?.skills?.length || 0} skills` })
      } else {
        const err = await res.json()
        toast({ title: 'Parse Failed', description: err.error || 'Could not parse resume', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to parse resume', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  // Search jobs
  const handleSearchJobs = async () => {
    setLoading('searching')
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: searchLocation,
          jobType: searchJobType === 'any' ? '' : searchJobType,
          numResults: 15,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        const data = json.jobs || []
        setSearchResults(data)
        toast({ title: 'Jobs Found!', description: `${data.length} jobs matched your search` })
      } else {
        const err = await res.json()
        toast({ title: 'Search Failed', description: err.error || 'Could not search jobs', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to search jobs', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  // Save a job
  const handleSaveJob = async (job: Job) => {
    try {
      const res = await fetch('/api/jobs/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...job,
          matchScore: job.matchScore || null,
        }),
      })
      if (res.ok) {
        await loadSavedJobs()
        await loadNotifications()
        toast({ title: 'Job Saved!', description: `${job.title} at ${job.company}` })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save job', variant: 'destructive' })
    }
  }

  // Delete a saved job
  const handleDeleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/saved/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await loadSavedJobs()
        toast({ title: 'Job Removed', description: 'Job has been removed from your list' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to remove job', variant: 'destructive' })
    }
  }

  // Update job status
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/jobs/saved/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, appliedDate: status === 'applied' ? new Date().toISOString() : undefined }),
      })
      if (res.ok) {
        await loadSavedJobs()
        await loadNotifications()
        toast({ title: 'Status Updated', description: `Job marked as ${status}` })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    }
  }

  // Generate cover letter
  const handleGenerateCoverLetter = async (job: SavedJob) => {
    setCoverLetterJob(job)
    setLoading('coverLetter')
    setShowCoverLetter(true)
    setGeneratedCoverLetter('')
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          resumeText,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeneratedCoverLetter(data.coverLetter)
        await loadSavedJobs()
      } else {
        const err = await res.json()
        toast({ title: 'Generation Failed', description: err.error || 'Could not generate cover letter', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to generate cover letter', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  // Mark notifications as read
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      await loadNotifications()
    } catch (e) {
      console.error(e)
    }
  }

  // Save preferences
  const handleSavePreferences = async () => {
    setLoading('preferences')
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })
      if (res.ok) {
        toast({ title: 'Preferences Saved!', description: 'Your job search preferences have been updated' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save preferences', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const statusColors: Record<string, string> = {
    saved: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    interviewing: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    offered: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  }

  const filteredApplications = applicationFilter === 'all'
    ? savedJobs
    : savedJobs.filter(j => j.status === applicationFilter)

  const getMatchColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-500'
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">JobHunter AI</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Smart Job Search for Data Professionals</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => { setShowNotifications(!showNotifications); handleMarkAllRead() }}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Notifications dropdown */}
        {showNotifications && (
          <div className="absolute right-4 top-16 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border rounded-xl shadow-xl z-50">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-semibold text-sm">Notifications</span>
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
                Mark all read
              </Button>
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
            ) : (
              notifications.slice(0, 10).map(n => (
                <div key={n.id} className={`p-3 border-b last:border-0 text-sm ${!n.read ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}`}>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-muted-foreground text-xs mt-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="resume" className="gap-2">
              <FileText className="w-4 h-4 hidden sm:block" />
              <span>Resume</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Search className="w-4 h-4 hidden sm:block" />
              <span>Find Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <Bookmark className="w-4 h-4 hidden sm:block" />
              <span>Applications</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4 hidden sm:block" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* ========= RESUME TAB ========= */}
          <TabsContent value="resume">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Resume Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-600" />
                    Your Resume
                  </CardTitle>
                  <CardDescription>
                    Paste your resume text below. Our AI will extract your skills, experience, and education to match you with the best jobs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste your resume text here... Include your work experience, skills, education, and any relevant projects or certifications."
                    className="min-h-[300px] font-mono text-sm"
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                  />
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleParseResume}
                    disabled={loading === 'parsing'}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  >
                    {loading === 'parsing' ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing Resume...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Parse with AI</>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Parsed Profile */}
              <div className="space-y-4">
                {profile ? (
                  <>
                    {/* Profile Summary */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileBadge className="w-4 h-4 text-emerald-600" />
                          Profile Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {profile.name && <p className="font-semibold text-lg">{profile.name}</p>}
                        {profile.title && <p className="text-sm text-muted-foreground">{profile.title}</p>}
                        {profile.email && <p className="text-sm text-muted-foreground">{profile.email}</p>}
                        {profile.summary && <p className="text-sm mt-2">{profile.summary}</p>}
                      </CardContent>
                    </Card>

                    {/* Skills */}
                    {profile.skills && profile.skills.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            Extracted Skills ({profile.skills.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {profile.skills.map((skill, i) => (
                              <Badge key={i} variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Experience */}
                    {profile.experience && profile.experience.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-emerald-600" />
                            Experience
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {profile.experience.map((exp, i) => (
                            <div key={i} className="border-l-2 border-emerald-200 dark:border-emerald-800 pl-3">
                              <p className="font-medium text-sm">{exp.title}</p>
                              <p className="text-sm text-muted-foreground">{exp.company}</p>
                              <p className="text-xs text-muted-foreground">{exp.duration}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Education */}
                    {profile.education && profile.education.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-emerald-600" />
                            Education
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {profile.education.map((edu, i) => (
                            <div key={i}>
                              <p className="font-medium text-sm">{edu.degree}</p>
                              <p className="text-sm text-muted-foreground">{edu.school} {edu.year && `— ${edu.year}`}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No Resume Parsed Yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Paste your resume text on the left and click &quot;Parse with AI&quot; to extract your skills, experience, and education automatically.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ========= FIND JOBS TAB ========= */}
          <TabsContent value="jobs">
            <div className="space-y-6">
              {/* Search Form */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-emerald-600" />
                    Search Jobs
                  </CardTitle>
                  <CardDescription>
                    Find Data Analytics & Data Science roles that match your profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2 lg:col-span-1">
                      <Label htmlFor="query">Keywords</Label>
                      <Input
                        id="query"
                        placeholder="data analyst, data scientist..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="Lagos, Remote..."
                        value={searchLocation}
                        onChange={e => setSearchLocation(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="jobType">Job Type</Label>
                      <Select value={searchJobType} onValueChange={setSearchJobType}>
                        <SelectTrigger id="jobType">
                          <SelectValue placeholder="Any type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any type</SelectItem>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleSearchJobs}
                        disabled={loading === 'searching'}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                      >
                        {loading === 'searching' ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</>
                        ) : (
                          <><Search className="w-4 h-4 mr-2" />Search</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{searchResults.length} Jobs Found</h3>
                  </div>
                  <div className="space-y-3">
                    {searchResults.map((job, i) => {
                      const jobKey = `${job.title}-${job.company}`
                      const isSaved = savedJobIds.has(jobKey)
                      return (
                        <Card key={i} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2">
                                  <h4 className="font-semibold text-base leading-tight">{job.title}</h4>
                                  {job.matchScore && (
                                    <Badge className={`shrink-0 ${getMatchColor(job.matchScore)}`} variant="outline">
                                      {Math.round(job.matchScore)}% match
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                                  {job.company && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="w-3.5 h-3.5" />
                                      {job.company}
                                    </span>
                                  )}
                                  {job.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {job.location}
                                    </span>
                                  )}
                                  {job.salary && (
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-3.5 h-3.5" />
                                      {job.salary}
                                    </span>
                                  )}
                                  {job.jobType && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      {job.jobType}
                                    </span>
                                  )}
                                  {job.source && (
                                    <Badge variant="outline" className="text-xs">{job.source}</Badge>
                                  )}
                                </div>
                                {job.description && (
                                  <p className="text-sm mt-2 line-clamp-2">{job.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {job.url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-4 h-4 mr-1" />View
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  variant={isSaved ? 'secondary' : 'default'}
                                  size="sm"
                                  disabled={isSaved}
                                  onClick={() => handleSaveJob(job)}
                                  className={!isSaved ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                                >
                                  <Bookmark className="w-4 h-4 mr-1" />
                                  {isSaved ? 'Saved' : 'Save'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {searchResults.length === 0 && loading !== 'searching' && (
                <Card className="flex flex-col items-center justify-center min-h-[250px] text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Search for Jobs</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Enter keywords, location, and job type above to find Data Analytics & Data Science roles that match your skills.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ========= APPLICATIONS TAB ========= */}
          <TabsContent value="applications">
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Total Saved', count: savedJobs.length, color: 'bg-slate-100 dark:bg-slate-800' },
                  { label: 'Applied', count: savedJobs.filter(j => j.status === 'applied').length, color: 'bg-blue-50 dark:bg-blue-950' },
                  { label: 'Interviewing', count: savedJobs.filter(j => j.status === 'interviewing').length, color: 'bg-amber-50 dark:bg-amber-950' },
                  { label: 'Offered', count: savedJobs.filter(j => j.status === 'offered').length, color: 'bg-green-50 dark:bg-green-950' },
                  { label: 'Rejected', count: savedJobs.filter(j => j.status === 'rejected').length, color: 'bg-red-50 dark:bg-red-950' },
                ].map(stat => (
                  <Card key={stat.label} className={`${stat.color}`}>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{stat.count}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground" />
                {['all', 'saved', 'applied', 'interviewing', 'offered', 'rejected'].map(status => (
                  <Button
                    key={status}
                    variant={applicationFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setApplicationFilter(status)}
                    className={applicationFilter === status ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>

              {/* Job List */}
              {filteredApplications.length > 0 ? (
                <div className="space-y-3">
                  {filteredApplications.map(job => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap">
                              <h4 className="font-semibold text-base">{job.title}</h4>
                              <Badge className={statusColors[job.status] || ''}>{job.status}</Badge>
                              {job.matchScore && (
                                <Badge variant="outline" className={getMatchColor(job.matchScore)}>
                                  {Math.round(job.matchScore)}%
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" />
                                {job.company}
                              </span>
                              {job.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {job.location}
                                </span>
                              )}
                              {job.salary && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  {job.salary}
                                </span>
                              )}
                              {job.appliedDate && (
                                <span className="flex items-center gap-1">
                                  Applied: {new Date(job.appliedDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {job.coverLetter && (
                              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                <FileText className="w-3 h-3" />Cover letter generated
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <Select onValueChange={val => handleUpdateStatus(job.id, val)}>
                              <SelectTrigger className="w-[130px] h-9">
                                <SelectValue placeholder="Update status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="saved">Saved</SelectItem>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="interviewing">Interviewing</SelectItem>
                                <SelectItem value="offered">Offered</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => handleGenerateCoverLetter(job)}>
                              <Sparkles className="w-4 h-4 mr-1" />Cover Letter
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedJob(job); setShowJobDetail(true) }}>
                              View
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteJob(job.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="flex flex-col items-center justify-center min-h-[250px] text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-4">
                    <Bookmark className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No Saved Jobs Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Search for jobs and save the ones that interest you. They&apos;ll appear here so you can track your applications.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab('jobs')}>
                    <Search className="w-4 h-4 mr-2" />Search for Jobs
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ========= SETTINGS TAB ========= */}
          <TabsContent value="settings">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-emerald-600" />
                    Job Search Preferences
                  </CardTitle>
                  <CardDescription>
                    Configure what kind of jobs you&apos;re looking for. These preferences will be used to find better matches.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Job Titles (comma-separated)</Label>
                    <Input
                      placeholder="Data Analyst, Data Scientist, Business Analyst..."
                      value={preferences.jobTitles.join(', ')}
                      onChange={e => setPreferences({
                        ...preferences,
                        jobTitles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                    />
                  </div>
                  <div>
                    <Label>Preferred Locations (comma-separated)</Label>
                    <Input
                      placeholder="Lagos, Abuja, Remote..."
                      value={preferences.locations.join(', ')}
                      onChange={e => setPreferences({
                        ...preferences,
                        locations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                    />
                  </div>
                  <div>
                    <Label>Job Types (comma-separated)</Label>
                    <Input
                      placeholder="Full-time, Remote, Hybrid..."
                      value={preferences.jobTypes.join(', ')}
                      onChange={e => setPreferences({
                        ...preferences,
                        jobTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                    />
                  </div>
                  <div>
                    <Label>Minimum Salary</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      value={preferences.salaryMin || ''}
                      onChange={e => setPreferences({
                        ...preferences,
                        salaryMin: e.target.value ? parseInt(e.target.value) : null
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="remote">Remote Only</Label>
                    <Switch
                      id="remote"
                      checked={preferences.remoteOnly}
                      onCheckedChange={val => setPreferences({ ...preferences, remoteOnly: val })}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleSavePreferences}
                    disabled={loading === 'preferences'}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  >
                    {loading === 'preferences' ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                    ) : (
                      <>Save Preferences</>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Quick Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    Tips for Better Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-emerald-600">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Upload a Detailed Resume</p>
                        <p className="text-xs text-muted-foreground">The more detail in your resume, the better our AI can match you with relevant positions. Include specific tools, technologies, and quantifiable achievements.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-emerald-600">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Use Specific Keywords</p>
                        <p className="text-xs text-muted-foreground">Search with specific terms like &quot;SQL Data Analyst&quot; or &quot;Machine Learning Engineer&quot; rather than just &quot;data&quot; for more targeted results.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-emerald-600">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Generate Tailored Cover Letters</p>
                        <p className="text-xs text-muted-foreground">Use our AI cover letter generator for each application. A customized cover letter significantly increases your response rate from employers.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-emerald-600">4</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Track Your Applications</p>
                        <p className="text-xs text-muted-foreground">Keep your application statuses updated. Tracking helps you follow up on time and stay organized throughout your job search process.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-emerald-600">5</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Set Clear Preferences</p>
                        <p className="text-xs text-muted-foreground">Configure your job titles, locations, and salary expectations to filter out irrelevant listings and focus on the opportunities that matter most to you.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Cover Letter Dialog */}
      <Dialog open={showCoverLetter} onOpenChange={setShowCoverLetter}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              AI Cover Letter
            </DialogTitle>
            <DialogDescription>
              {coverLetterJob ? `Cover letter for ${coverLetterJob.title} at ${coverLetterJob.company}` : 'Generating...'}
            </DialogDescription>
          </DialogHeader>
          {loading === 'coverLetter' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
              <p className="text-sm text-muted-foreground">AI is crafting your personalized cover letter...</p>
            </div>
          ) : generatedCoverLetter ? (
            <div className="space-y-4">
              <Textarea
                className="min-h-[300px] text-sm"
                value={generatedCoverLetter}
                onChange={e => setGeneratedCoverLetter(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCoverLetter)
                    toast({ title: 'Copied!', description: 'Cover letter copied to clipboard' })
                  }}
                >
                  Copy to Clipboard
                </Button>
                {coverLetterJob?.url && (
                  <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <a href={coverLetterJob.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />Open Job Application
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Job Detail Dialog */}
      <Dialog open={showJobDetail} onOpenChange={setShowJobDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
            <DialogDescription>
              {selectedJob?.company} {selectedJob?.location && `— ${selectedJob.location}`}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedJob.matchScore && (
                  <Badge className={getMatchColor(selectedJob.matchScore)}>
                    {Math.round(selectedJob.matchScore)}% Match
                  </Badge>
                )}
                <Badge className={statusColors[selectedJob.status]}>{selectedJob.status}</Badge>
                {selectedJob.jobType && <Badge variant="outline">{selectedJob.jobType}</Badge>}
                {selectedJob.salary && <Badge variant="outline">{selectedJob.salary}</Badge>}
              </div>
              {selectedJob.description && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Description</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedJob.description}</p>
                </div>
              )}
              {selectedJob.coverLetter && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Cover Letter</h4>
                  <p className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">{selectedJob.coverLetter}</p>
                </div>
              )}
              {selectedJob.notes && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedJob.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selectedJob.url && (
                  <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <a href={selectedJob.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />View Original Listing
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => { handleGenerateCoverLetter(selectedJob); setShowJobDetail(false) }}>
                  <Sparkles className="w-4 h-4 mr-1" />Generate Cover Letter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          JobHunter AI — Smart Job Search for Data Professionals
        </div>
      </footer>
    </div>
  )
}
