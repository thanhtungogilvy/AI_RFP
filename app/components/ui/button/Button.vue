<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import type { VariantProps } from "class-variance-authority"
import { Primitive } from "reka-ui"
import { cn } from '~/utils/utils'
import { buttonVariants } from "./buttonVariants"

type ButtonVariants = VariantProps<typeof buttonVariants>

interface Props {
  as?: PrimitiveProps['as']
  asChild?: PrimitiveProps['asChild']
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
  class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
  asChild: false,
})
</script>

<template>
  <Primitive
    :as="props.as"
    :as-child="props.asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
