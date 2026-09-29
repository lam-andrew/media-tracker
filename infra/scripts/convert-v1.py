#!/usr/bin/env python3
"""Offline conversion; requires explicit source owner, never connects to Supabase."""
import argparse, json, os
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('input');p.add_argument('output');p.add_argument('--user-id',required=True)
a=p.parse_args()
with open(a.input) as f:data=json.load(f)
rows=data if isinstance(data,list) else data.get('items',[])
entries=[]
for r in rows:
    if r.get('user_id')!=a.user_id:continue
    m=r.get('media_items') or r.get('media');
    if not m:raise ValueError('Joined media_items is required for every item')
    metadata=m.get('metadata') or {};progress=r.get('progress') or {};kind=m['type']
    current=progress.get('current_page',0) if kind=='book' else progress.get('episode',0) if kind=='tv' else progress.get('percent',0) if kind=='game' else 0
    total=progress.get('total_pages') if kind=='book' else 100 if kind=='game' else None
    metadata={**metadata,'year':m.get('release_year'),'pages':metadata.get('pageCount') or metadata.get('page_count'),'legacyProgress':progress}
    tracking={'status':r['status'],'rating':float(r['rating']) if r.get('rating') is not None else None,'favorite':r.get('favorite',False),'current':int(current or 0),'total':int(total) if total else None,'notes':r.get('notes') or '', 'finishedAt':r.get('finished_at'),'startedAt':r.get('started_at'),'season':progress.get('season')}
    entries.append({'media':{'source':m['external_source'],'externalId':m['external_id'],'type':kind,'title':m['title'],'creators':m.get('creators') or [],'image':m.get('image_url'),'description':metadata.get('description') or metadata.get('overview') or '', 'metadata':metadata},'tracking':tracking,'createdAt':r['created_at']})
goals=[] if isinstance(data,list) else [{'year':g['year'],'type':g.get('type') or 'all','target':g['target']} for g in data.get('goals',[]) if g.get('user_id')==a.user_id]
fd=os.open(a.output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:json.dump({'format':'marqd-v2','version':1,'entries':entries,'goals':goals},f,indent=2)
print(f'Converted {len(entries)} entries and {len(goals)} goals for the selected owner. Import this file while signed in as the destination owner.')
