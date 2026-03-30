import { Skeleton, Stack } from "@mui/material";

export default function SkeletonOverlay(){
    return (
        <Stack spacing={1} sx={{ p: 2 }}>
            <Skeleton height={20}/>
            <Skeleton height={20}/>
            <Skeleton height={20}/>
            <Skeleton height={20}/>
        </Stack>
    )
}